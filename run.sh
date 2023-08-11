#!/bin/bash
argv=$1

if [ -z "$argv" ]; then
    app_dir=/var/www/agoraio-tools
else
    app_dir=$argv
fi

echo "(i) App folder is $app_dir"

if [ ! -d "$app_dir" ]; then
    echo "(e) Folder does not exist"
    exit 1
fi

recording_folder=${app_dir}/server/public/output/recording
current_container_id=''
rm -rfv ${recording_folder}/*

echo "+ Build new image of recording app"
docker build . -t lovici/api-record

if [ "$(docker ps -q -f name=api_record)" ]; then
    current_container_id=$(docker ps -q -f name=api_record)
    docker cp $current_container_id:/app/server/public/output/recording/. $recording_folder
fi

if [ ! -z "$current_container_id" ]; then
    echo "+ Stop and remove old version container"
    docker stop $current_container_id
    docker rm $current_container_id
fi
docker run --restart=always --name=api_record -p 3030:3000 -d lovici/api-record
if [ "$(docker ps -q -f name=api_record)" ]; then
    container_id=$(docker ps -q -f name=api_record)
    docker cp ${recording_folder}/. $container_id:/app/server/public/output/recording
    echo "+ Application working and running at $container_id"

    echo "(i) Remove recording folder in system directory"
    rm -vfr ${recording_folder}/*
fi

