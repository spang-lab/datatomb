#!/usr/bin/env bash

kubectl apply -f ./namespace.yaml 
kubectl -n data-management create configmap datatomb-config \
    --from-file='./config.yaml'

kubectl apply -f ./secret.yaml -f ./ingress.yaml -f ./service.yaml
kubectl apply -f ./deployment.yaml


