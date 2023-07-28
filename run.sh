docker build . -t barada/agoraio-tools
docker run --restart=always --name=agoraio_tools -p 3030:3000 -d barada/agoraio-tools