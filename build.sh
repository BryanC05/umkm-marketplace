#!/bin/bash
set -e
cd backend
go build -o server ./cmd/server
