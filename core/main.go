package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"mihomo-client/core/internal/api"
)

func main() {
	port := flag.Int("port", 38888, "control plane listen port")
	dataDir := flag.String("home", defaultDataDir(), "data directory")
	flag.Parse()

	server, err := api.NewServer(*dataDir)
	if err != nil {
		log.Fatalf("init server: %v", err)
	}

	addr := fmt.Sprintf("127.0.0.1:%d", *port)
	log.Printf("mihomo-client control plane listening on %s", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatalf("http server: %v", err)
	}
}

func defaultDataDir() string {
	base, err := os.UserConfigDir()
	if err != nil || base == "" {
		base = "."
	}
	return filepath.Join(base, "mihomo-client")
}
