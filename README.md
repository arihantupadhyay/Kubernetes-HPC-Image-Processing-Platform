# Kubernetes-Based Distributed HPC Image Processing Platform

A distributed image-processing platform built using React, Node.js, Python, Redis, BullMQ, Docker, and Kubernetes. The system distributes image-processing jobs across multiple worker pods and provides monitoring, job history, persistent storage, and machine-learning-based processing-time prediction.

## Project Overview

The platform allows users to upload images, select processing operations, and monitor jobs through a web dashboard. The backend manages jobs using BullMQ and Redis, while Python workers execute image-processing tasks in parallel inside Kubernetes.

The project also includes a Random Forest regression model trained on collected processing-job data to estimate image-processing time.

## Key Features

- Image upload with a 50 MB per-file limit
- Image resizing
- Grayscale conversion
- Gaussian blur
- Image sharpening
- Distributed job processing using Redis and BullMQ
- Multiple Kubernetes worker replicas
- Kubernetes Horizontal Pod Autoscaling configuration
- Persistent storage for uploaded and processed images
- Job history and processing metrics
- System monitoring dashboard
- Processed image gallery
- Random Forest processing-time prediction
- Analytics dashboard

## System Architecture

```text
                 User
                  |
                  v
          React Frontend
                  |
                  v
          Node.js / Express
                  |
                  v
             BullMQ Queue
                  |
                  v
              Redis
                  |
          -----------------
          |       |       |
          v       v       v
        Worker  Worker  Worker
          Pod     Pod     Pod
          |       |       |
          -----------------
                  |
                  v
          Python Image Processing
                  |
                  v
          Persistent Storage
                  |
                  v
          Processed Images

## Technology Stack

- Frontend: React, Vite, JavaScript
- Backend: Node.js, Express.js
- Queue: Redis and BullMQ
- Image Processing: Python and Pillow
- Machine Learning: Scikit-learn, Random Forest Regressor
- Containers: Docker
- Orchestration: Kubernetes and Minikube
- Storage: Kubernetes PVC

## Features

- Image upload with 50 MB per-file limit
- Resize, grayscale, blur, and sharpen operations
- Distributed image processing using Redis and BullMQ
- Multiple Kubernetes worker replicas
- Persistent storage
- Job history and processing metrics
- System monitoring dashboard
- Processed image gallery
- ML-based processing-time prediction

## Machine Learning Results

| Metric | Result |
|---|---:|
| Dataset records | 100 |
| Training records | 80 |
| Testing records | 20 |
| MAE | 0.7646 seconds |
| R2 Score | 0.2311 |

The Random Forest model uses image size, dimensions, pixel count, and operation type to predict processing time. Its current predictive performance is modest and experimental.

## Project Structure

- `frontend/` - React application
- `backend/` - Express APIs and queue management
- `image-worker/` - Python image processing
- `ml/` - Model training and saved model
- `kubernetes/` - Kubernetes manifests
- `docs/` - Project documentation
- `screenshots/` - Application screenshots

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Kubernetes Deployment

```bash
minikube start
kubectl apply -f kubernetes/
kubectl get pods
kubectl get services
```

Access backend locally:

```bash
kubectl port-forward service/backend 5001:5001
```

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `/api/jobs` | Job history |
| `/api/analytics` | System analytics |
| `/api/monitor` | System monitoring |
| `/api/processed` | Processed images |
| `/api/ml-results` | ML results |
| `/processed/:filename` | Retrieve processed image |

## Future Scope

- Distributed video processing
- GPU-accelerated processing
- Improved ML prediction performance
- Advanced worker scheduling
- Cloud Kubernetes deployment
- Authentication and user management

## Academic Project

**Institution:** Amity University Uttar Pradesh, Noida Campus  
**Project Guide:** Dr. Deepika Jain  
**Students:** Arihant Upadhayay (Roll No. 16) and Rishit Verma (Roll No. 01)

---

Developed as an academic project demonstrating distributed processing, containerization, Kubernetes orchestration, and machine-learning-based analytics.
