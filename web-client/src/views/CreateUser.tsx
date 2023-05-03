import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {useUsers} from '../hooks/useUsers';
import {Link} from 'react-router-dom';
import {
  EuiPanel,
  EuiButton,
  EuiSpacer,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldText,
  EuiButtonEmpty,
  EuiPageTemplate,
  EuiListGroupItem,
  EuiSkeletonRectangle,
  EuiSelect,
  EuiTitle,
  EuiComboBox,
  EuiRadioGroup,
  EuiCheckbox,
  EuiTable,
  EuiBasicTable,
  EuiIcon,
  EuiSplitPanel,
  EuiPagination,
  EuiButtonIcon,
  EuiSuperSelect,
  EuiTextColor,
  EuiText,
} from '@elastic/eui';
import { useNamespaceList } from '../hooks/useNamespaceList';
import { httpRequests } from '../services/httpRequests';
import { ClusterAccess } from "../components/types";
import { httpClient } from "../services/httpClient";
// import { rolebinding } from "../services/rolebindingCreateRequests";

import { AggregatedRoleBinding } from "../services/role";
import { method } from 'bluebird';
import { Subject } from '../hooks/useRbac';
import { ClusterRolebindingCreate } from '../services/rolebindingCreateRequests';

type SummaryItem = {
  resource: string,
  read: boolean,
  write: boolean,
  namespaces: string[],
}

const mockedItems: SummaryItem[] = [
  {
    resource: '*',
    read: true,
    write: false,
    namespaces: ['my-namespace', 'another-namespace'],
  },
]

const clusterAccessOptions = [
  {
    id: 'none',
    label: 'none',
  },
  {
    id: 'read',
    label: 'read',
  },
  {
    id: 'write',
    label: 'write',
  },
];

const clusterRoleMap = {
  none: false,
  read: 'read-only',
  write: 'admin'
}

const templateOptions = [
  {
    value: 'developer',
    inputDisplay: 'Developer',
  },
  {
    value: 'operation',
    inputDisplay: 'Operation',
  },
];

interface UserCreationParams {
  generated_for_user: string,
  roleName: string, // params.template,
  namespace: string, // params.namespace,
  roleKind: string, // params.roleKind,
  subjects: Subject[], // params.subjects,
  roleBindingName: string,// params.roleBindingName
};


const CreateUser = () => {
  const [username, setUsername] = useState<string>('');
  const [clusterAccess, setClusterAccess] = useState<ClusterAccess>('none');
  const [selectedNamespaces, setSelectedNamespaces] = useState<any[]>([]);
  const [allNamespaces, setAllNamespaces] = useState<boolean>(false);
  // const [aggregatedRoleBindings, setAggregatedRoleBindings] = useState<AggregatedRoleBinding[]>([])

  const [selectedTemplateRole, setSelectedTemplateRole] = useState<string>('developer')

  // Queries
  // const listUsers = useQuery('testQuery', useUsers)


  // Mutations
  // const mutation = useMutation(postTodo, {
  //   onSuccess: () => {
  //     // Invalidate and refetch
  //     queryClient.invalidateQueries('todos')
  //   },
  // })

  const createUser = useMutation({
    mutationFn: (username: string) => {
      return httpRequests.userRequests.create(username)
    },
  });

  const createRoleBindings = useMutation({
    mutationFn: (params: UserCreationParams) => {
      return httpClient.post('/api/create-rolebinding', params);
    }
  });

  const createClusterRoleBindings = useMutation({
    mutationFn: (params: any) => {
      return httpClient.post('/api/create-cluster-rolebinding', params);

      // return httpRequests.rolebindingRequests.create.fromAggregatedRolebindings(
      //   [],
      //   username,
      //   clusterAccess,
      // )
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      // Create User Queries
      createUser.mutate(username);
      // API as of now needs to be called one time for each namespace
      selectedNamespaces.forEach(ns => {
        createRoleBindings.mutate({
          roleName: `template-namespaced-resources___${selectedTemplateRole}`,
          namespace: ns.value,
          roleKind: 'ClusterRole',
          subjects: [{kind: 'ServiceAccount', name: username, namespace: 'permission-manager'}],
          roleBindingName: `${username}___template-namespaced-resources___${selectedTemplateRole}___${ns.value}`,
          generated_for_user: username,
        })
      });
      // Call to define Cluster Resources Access
      clusterAccess !== 'none' && createClusterRoleBindings.mutate({
        // aggregatedRoleBindings:[{}],
        roleName: `template-cluster-resources___${clusterRoleMap[clusterAccess]}`,
        subjects: [{kind: 'ServiceAccount', name: username, namespace: 'permission-manager'}],
        clusterRolebindingName: `${username}___template-cluster-resources___${clusterRoleMap[clusterAccess]}`,
      })

      // await httpRequests.rolebindingRequests.create.fromAggregatedRolebindings(
      //   aggregatedRoleBindings,
      //   username,
      //   clusterAccess,
      // )

      // history.push(`/users/${username}`)

    } catch (e) {
      // TODO add proper error modal
      console.error('user creation error', e)
    }
  }

  return (
    <>
      <EuiPageTemplate restrictWidth={1024}>
        <EuiPageTemplate.Header
          pageTitle="Create New User"
        />
        <EuiPageTemplate.Section>
          <EuiFlexGroup direction='row'>
            <EuiFlexItem grow style={{ maxWidth: 400 }}>
              <EuiFlexGroup direction='column'>
                <EuiFlexItem>
                  <EuiFlexGroup direction='row' justifyContent='spaceBetween'>
                    <EuiFlexItem grow={false}><EuiTitle><h3>User data</h3></EuiTitle></EuiFlexItem>
                    <EuiFlexItem grow={false}><EuiButton fill onClick={handleSubmit}>SAVE</EuiButton></EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Username">
                    <EuiFieldText icon="user" placeholder="john.doe" onChange={(e) => setUsername(e.target.value)} />
                  </EuiFormRow>
                  <EuiFormRow label="Access to cluster resources (non-namespaced)">
                  <EuiRadioGroup
                    name="cluster-access-config"
                    options={clusterAccessOptions}
                    idSelected={clusterAccess}
                    onChange={(e) => {
                      console.log('radio', e)
                      setClusterAccess(e as any)
                    }}
                  />
                  </EuiFormRow>
                  <EuiSpacer size='m' />
                  {/* Template - Roles */}
                  <TemplatesSlider
                    children={[]}
                    allNamespaces={allNamespaces}
                    setAllNamespaces={setAllNamespaces}
                    selectedNamespaces={selectedNamespaces}
                    setSelectedNamespaces={setSelectedNamespaces}

                    selectedTemplateRole={selectedTemplateRole}
                    setSelectedTemplateRole={setSelectedTemplateRole}
                  />

                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiPanel color='subdued'>
                <EuiFlexGroup direction='column'>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size='s'>
                      <h3><EuiTextColor color="subdued">Summary</EuiTextColor></h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiBasicTable
                      tableCaption="Summary"
                      // rowHeader="firstName"
                      tableLayout='auto'
                      columns={[
                        {field: 'resource', name: 'Resource', dataType: 'string'},
                        {
                          field: 'read',
                          name: 'READ',
                          dataType: 'boolean',
                          render: (readValue: SummaryItem['read']) => {
                            return <EuiIcon id='read1' type={readValue ? 'check' : 'cross'} />;
                          }
                        },
                        {
                          field: 'write', name: 'WRITE', dataType: 'boolean',
                          render: (readValue: SummaryItem['write']) => {
                            return <EuiIcon id='read1' type={readValue ? 'check' : 'cross'} />;
                          }
                        },
                        {field: 'namespaces', name: 'Namespaces', textOnly: true},
                      ]}
                      items={mockedItems as any}
                      // rowProps={getRowProps}
                      // cellProps={getCellProps}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}

const TemplateSelect = (props: any) => {
  const { selectedTemplateRole, setSelectedTemplateRole } = props;

  const onChange = (selectedOptions) => {
    setSelectedTemplateRole(selectedOptions);
  };

  return (
    <EuiFormRow label="Template (of Role)">
      <EuiSuperSelect
        onChange={onChange}
        options={templateOptions}
        valueOfSelected={selectedTemplateRole}
        append={
          <EuiButtonEmpty
            iconType='iInCircle'
            iconSide='right'
            onClick={() => console.log('info')}
          >
            Info
          </EuiButtonEmpty>
        }
      />
    </EuiFormRow>
  )
}

const NameSpaceSelect = (props: any) => {
  // Repeat the call for every namespace
  const {selectedNamespaces, setSelectedNamespaces, allNamespaces, setAllNamespaces} = props;
  // const {namespaceList} = useNamespaceList();
  const {data, isError, isLoading, isSuccess } = useQuery({
    queryKey: ['listNamespaces'],
    queryFn: () => httpRequests.namespaceList(),
  })

  console.log('ns req', data, isLoading, isError);


  const nameSpaceOptions = !isLoading && !isError && data.data.namespaces
    .map(ns => {
      return {label: ns, value: ns}
    })

  // useEffect(() => {
  //   nameSpaceOptions.length && setSelectedNamespaces([nameSpaceOptions[0], nameSpaceOptions[1]])
  // }, [data])

  console.log('test', nameSpaceOptions)

  const onChange = (selectedOptions) => {
    setSelectedNamespaces(selectedOptions);
  };

  const onCheck = (e) => {
    setAllNamespaces(e.target.checked);
  };

  return (
    <EuiFormRow label="Namespace">
      <>
        <EuiComboBox
          // async
          aria-label="Namespace Selection"
          placeholder="Select Namespaces..."
          options={isSuccess ? nameSpaceOptions : []}
          selectedOptions={allNamespaces ? [{label: 'All', value: 'all'}] : selectedNamespaces}
          onChange={onChange}
          isDisabled={allNamespaces}
          // onCreateOption={() => {}}
          isLoading={nameSpaceOptions.length < 1}
          isClearable={true}
        />
        <EuiSpacer size='xs' />
        <EuiCheckbox
          id="check1"
          label="All Namespaces"
          checked={allNamespaces}
          onChange={onCheck}
        />
      </>
    </EuiFormRow>
  )
}

const TemplatesSlider = (props: any) => {
  const {
    index,
    children,
    allNamespaces,
    setAllNamespaces,
    selectedNamespaces,
    setSelectedNamespaces,
    selectedTemplateRole,
    setSelectedTemplateRole
  } = props;
  const [currentPage, setCurrentPage] = React.useState(0);

  const panelContainerRef = useRef<HTMLDivElement>(null);

  const scrollLenght = 353;

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    panelContainerRef.current?.scrollTo(scrollLenght * pageNumber, 0);
  };

  return (
    <>
      <EuiFlexGroup direction="row" alignItems='center' justifyContent='spaceBetween'>
        <EuiFlexItem><EuiText color='subdued' size='xs'><b>TEMPLATES</b></EuiText></EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent='flexEnd' alignItems='center' gutterSize='xs'>
            <EuiFlexItem>
              <EuiButtonEmpty
                iconType="plusInCircle"
                iconSide='right'
                size="s"
                // onClick={() => {
                //   const newIndex = children.size + 1;
                //   const newPanel = Form.buildComponentFromSchema(
                //         newIndex,
                //         caller,
                //         formFieldData.FormId
                //       );
                //       if (newPanel) {
                //         newPanel.listenIndex({
                //           changePathsWithIndex: newIndex,
                //         });
                //         addChild(newPanel);
                //   }
                // }}
              >
                Add
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPagination
                compressed
                // aria-label={`${formFieldData.Label} pagination`}
                pageCount={children.size}
                activePage={currentPage}
                onPageClick={(activePage) => goToPage(activePage)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

        </EuiFlexItem>

      </EuiFlexGroup>
      <EuiSpacer size='xs' />
      <EuiSplitPanel.Outer>
        <EuiSplitPanel.Inner>
          <EuiFlexGroup direction='row' justifyContent='spaceBetween' alignItems='center'>
            <EuiFlexItem>
              <EuiTitle size='xs'><h5># {index}</h5></EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconSide='right'
                iconType='trash'
                color='danger'
                disabled
                onClick={() => console.log('delete template')}>
                Delete
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size='s' />

          <TemplateSelect
            selectedTemplateRole={selectedTemplateRole}
            setSelectedTemplateRole={setSelectedTemplateRole}
          />
          <NameSpaceSelect
            allNamespaces={allNamespaces}
            setAllNamespaces={setAllNamespaces}
            selectedNamespaces={selectedNamespaces}
            setSelectedNamespaces={setSelectedNamespaces}
          />
        </EuiSplitPanel.Inner>
        {/* <EuiSplitPanel.Inner color="subdued">
          <EuiButton onClick={() => console.log('add')}>Add</EuiButton>
        </EuiSplitPanel.Inner> */}
      </EuiSplitPanel.Outer>
    </>
  )
}

export default CreateUser;
