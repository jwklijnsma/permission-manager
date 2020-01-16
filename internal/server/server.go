package server

import (
	"log"
	"net/http"
	"os"

	"github.com/go-playground/validator"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"

	"sighupio/permission-manager/internal/config"
	"sighupio/permission-manager/internal/resources"
	_ "sighupio/permission-manager/statik"

	"github.com/rakyll/statik/fs"
	"k8s.io/client-go/kubernetes"
)

// AppContext echo context extended with application specific fields
type AppContext struct {
	echo.Context
	Kubeclient kubernetes.Interface
}

func New(kubeclient kubernetes.Interface, cfg *config.Config, resourcesService resources.ResourcesService) *echo.Echo {
	e := echo.New()
	e.Validator = &CustomValidator{validator: validator.New()}

	basicAuthPassword := os.Getenv("BASIC_AUTH_PASSWORD")
	if basicAuthPassword == "" {
		log.Fatal("BASIC_AUTH_PASSWORD env cannot be empty")
	}

	e.Use(middleware.BasicAuth(func(username, password string, c echo.Context) (bool, error) {
		if username == "admin" && password == basicAuthPassword {
			return true, nil
		}
		return false, nil
	}))

	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			customContext := &AppContext{Context: c, Kubeclient: kubeclient}
			return next(customContext)
		}
	})

	// e.Use(middleware.Logger())
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "method=${method}, uri=${uri}, status=${status}\n",
	}))

	api := e.Group("/api")

	api.GET("/list-users", listUsers(resourcesService))
	api.GET("/list-namespace", ListNamespaces(resourcesService))
	api.GET("/rbac", ListRbac)

	api.POST("/create-cluster-role", CreateClusterRole)
	api.POST("/create-user", createUser(resourcesService))
	api.POST("/create-rolebinding", CreateRolebinding)
	api.POST("/create-cluster-rolebinding", createClusterRolebinding)

	api.POST("/delete-cluster-role", deleteClusterRole)
	api.POST("/delete-cluster-rolebinding", deleteClusterRolebinding)
	api.POST("/delete-rolebinding", deleteRolebinding)
	api.POST("/delete-role", deleteRole)
	api.POST("/delete-user", deleteUser(resourcesService))

	api.POST("/create-kubeconfig", createKubeconfig(cfg.ClusterName, cfg.ClusterControlPlaceAddress))

	statikFS, err := fs.New()
	if err != nil {
		e.Logger.Fatal(err)
	}

	spaHandler := http.FileServer(statikFS)
	e.Any("*", echo.WrapHandler(AddFallbackHandler(spaHandler.ServeHTTP, statikFS)))

	return e
}