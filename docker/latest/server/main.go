package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
)

//go:embed assets
var assets embed.FS

func main() {
	mutex := http.NewServeMux()
	md, _ := fs.Sub(assets, "assets")
	mutex.Handle("/", spaHandler(http.FS(md), "/index.html"))
	err := http.ListenAndServe(":80", mutex)
	if err != nil {
		log.Fatal(err)
	}
}

func spaHandler(fsys http.FileSystem, indexPath string) http.Handler {
    fileServer := http.FileServer(fsys)
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 如果请求的路径已经是 indexPath，则直接返回文件，防止循环重定向
        if r.URL.Path == indexPath {
            fileServer.ServeHTTP(w, r)
            return
        }
        // 尝试打开请求的文件
        f, err := fsys.Open(r.URL.Path)
        if err != nil {
            // 如果文件不存在，则返回 index 文件
            r.URL.Path = indexPath
        } else {
            fi, err := f.Stat()
            f.Close()
            // 如果出错或者请求的是目录，也返回 index 文件
            if err != nil || fi.IsDir() {
                r.URL.Path = indexPath
            }
        }
        fileServer.ServeHTTP(w, r)
    })
}