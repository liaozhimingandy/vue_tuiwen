package main

import (
    "embed"
    "io/fs"
    "log"
    "net/http"
    "path"
    "strings"
)

//go:embed assets/*
var assets embed.FS

func main() {
    // 从嵌入的 assets 目录中创建子文件系统
    dist, err := fs.Sub(assets, "assets")
    if err != nil {
        log.Fatalf("failed to create sub filesystem: %v", err)
    }

    // 创建文件服务器，用于提供静态文件
    staticHandler := http.FileServer(http.FS(dist))

    // 自定义处理器：如果请求的文件存在，则返回对应文件；否则返回 index.html
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        // 清理请求路径
        reqPath := path.Clean(r.URL.Path)
        // 去掉前导斜杠，以便在嵌入文件系统中查找文件
        lookupPath := strings.TrimPrefix(reqPath, "/")
        if lookupPath == "" {
            lookupPath = "index.html"
        }

        // 尝试打开请求的文件
        f, err := dist.Open(lookupPath)
        if err == nil {
            // 文件存在：关闭文件后直接交由文件服务器处理
            f.Close()
            staticHandler.ServeHTTP(w, r)
            return
        }

        // 文件不存在：返回 index.html 作为 fallback
        indexData, err := fs.ReadFile(dist, "index.html")
        if err != nil {
            http.Error(w, "index.html not found", http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "text/html; charset=utf-8")
        w.WriteHeader(http.StatusOK)
        w.Write(indexData)
    })

    log.Println("Server running on :80")
    err = http.ListenAndServe(":80", nil)
    if err != nil {
        log.Fatal(err)
    }
}
