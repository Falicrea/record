if [ "$(docker ps -q -f name=agoraio_tools)" ]; then
    container_id=$(docker ps -q -f name=agoraio_tools)
    docker stop $container_id
    docker rm $container_id
fi

docker build . -t barada/agoraio-tools
docker run --restart=always --name=agoraio_tools -p 3030:3000 -d barada/agoraio-tools