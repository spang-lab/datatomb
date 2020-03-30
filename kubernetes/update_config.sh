kubectl -n authentication delete configmap datatomb-config
kubectl -n authentication create configmap datatomb-config \
    --from-file='./config.yaml' \

# change something in the deployment so it gets rolled out again
kubectl -n data-management patch deployment datatomb-deployment -p \
    "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"last-update\":\"`date +'%s'`\"}}}}}"

