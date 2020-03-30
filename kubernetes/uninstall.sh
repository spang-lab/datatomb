#!/usr/bin/env bash

kubectl -n authentication delete configmap auth-server-config
kubectl delete -f ./secret.yaml -f ./ingress.yaml -f ./service.yaml -f ./deployment.yaml
