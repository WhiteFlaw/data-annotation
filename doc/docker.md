### Docker

#### Install Docker(安装Docker)

```
sudo apt install -y docker docker.io docker-registry
```

#### Build Image yourself(自行创建镜像, 较为繁琐)
```
cd Docker

# Build docker image (构建镜像，版本号每次必须更新)

sudo docker build -t xgk-3d:v1.0.0 .

# Create container of server ,Please replace ${YourDataPath} with the path where you put data on (创建容器, 请将用你的数据存储路径将变量${YourDataPath}替换, 注意数据要符合data/example中的组织方式)

sudo docker run -it -d --restart=always --name xgk3DServer -p 8081:8081 -v /home/xgk/DataSource:/root/data-annotate/data xgk-3d:v1.0.0 bash

```

#### Use docker image of dockerhub(使用现有镜像, 不保证代码为最新)

```
sudo docker run -it -d --restart=always -p 8081:8081 juhaoming/sustechpoints:v1.0.0 bash

sudo docker run -it -d --restart=always -p 8081:8081 -v ${YourDataPath}:/root/SUSTechPOINTS/data juhaoming/sustechpoints:v1.0.0 bash

```
