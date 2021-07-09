package server

import (
	"github.com/labstack/echo"
	rbacv1 "k8s.io/api/rbac/v1"
)

func createClusterRole(c echo.Context) error {
	type Request struct {
		RoleName string              `json:"roleName" validate:"required"`
		Rules    []rbacv1.PolicyRule `json:"rules" validate:"required"`
	}
	ac := c.(*AppContext)

	r := new(Request)

	err := ac.validateAndBindRequest(r)

	if err != nil {
		return err
	}

	_, err = ac.ResourceService.ClusterRoleCreate(r.RoleName, r.Rules)

	if err != nil {
		return err
	}

	return ac.okResponse()
}

