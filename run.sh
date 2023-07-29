if [ "$(docker ps -q -f name=api_record)" ]; then
    container_id=$(docker ps -q -f name=api_record)
    docker stop $container_id
    docker rm $container_id
fi

docker build . -t lovici/api-record
docker run --restart=always --name=api_record -p 3030:3000 -d lovici/api-record