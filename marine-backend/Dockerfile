FROM node:18-alpine

# 设置时区
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

# 先安装依赖（利用 Docker 层缓存）
COPY package*.json ./
RUN npm install --production

# 拷贝源码
COPY . .

# 暴露端口
EXPOSE 3001

# 启动
CMD ["node", "src/app.js"]
