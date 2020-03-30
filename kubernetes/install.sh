#!/usr/bin/env bash

kubectl -n authentication create configmap datatomb-config \
    --from-file='./config.yaml'

kubectl apply -f ./secret.yaml -f ./ingress.yaml -f ./service.yaml
kubectl apply -f ./deployment.yaml


