#!/usr/bin/env bash

kubectl -n data-management delete configmap datatomb-config
kubectl delete -f ./secret.yaml -f ./ingress.yaml -f ./service.yaml -f ./deployment.yaml
kubectl delete -f ./namespace.yaml 
