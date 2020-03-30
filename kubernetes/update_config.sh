kubectl -n authentication delete configmap auth-server-config
kubectl -n authentication create configmap auth-server-config \
    --from-file='./config/main.yaml' \
    --from-file='./config/keys.yaml' \
    --from-file='./config/clients.yaml'

# change something in the deployment so it gets rolled out again
kubectl -n authentication patch deployment auth-server-deployment -p \
    "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"last-update\":\"`date +'%s'`\"}}}}}"

