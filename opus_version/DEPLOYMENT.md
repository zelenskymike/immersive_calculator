# 🚀 Deployment Guide

## Quick Start

### Local Development
```bash
# Run directly with Node.js
npm start
# Or with custom port
PORT=5001 npm run dev

# Access at http://localhost:5000
```

### Docker Deployment

#### Option 1: Simple Docker
```bash
# Build image
docker build -t immersion-calculator:v2.0 .

# Run container
docker run -d \
  --name tco-calculator \
  -p 5000:5000 \
  --restart unless-stopped \
  immersion-calculator:v2.0
```

#### Option 2: Docker Compose
```bash
# Start all services
docker-compose up -d

# With rebuild
docker-compose up --build -d

# View logs
docker-compose logs -f calculator
```
# Stop services
docker-compose down
```

## Production Deployment

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 2. SSL Certificate Setup
```bash
# Create SSL directory
mkdir ssl

# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem

# Or use Let's Encrypt (recommended)
certbot certonly --standalone -d yourdomain.com
```

### 3. Production Docker Compose
```bash
# Start with nginx proxy
docker-compose --profile production up -d

# Check status
docker-compose ps

# Monitor logs
docker-compose logs -f```

## Cloud Deployment Options

### AWS EC2
```bash
# SSH to your EC2 instance
ssh -i your-key.pem ec2-user@your-instance.amazonaws.com

# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/yourusername/immersion-calculator.git
cd immersion-calculator/opus_version

# Deploy
docker-compose up -d
```

### DigitalOcean App Platform
1. Fork repository to GitHub
2. Create new App in DigitalOcean
3. Connect GitHub repository
4. Set environment variables
5. Deploy

### Heroku
```bash
# Install Heroku CLI
# Create Procfile
echo "web: node server.js" > Procfile

# Create appheroku create your-app-name

# Deploy
git push heroku main

# Open app
heroku open
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check application health
curl http://localhost:5000/

# Docker health status
docker inspect --format='{{.State.Health.Status}}' tco-calculator

# View container stats
docker stats tco-calculator
```

### Logs
```bash
# View application logs
docker logs tco-calculator

# Follow logs
docker logs -f tco-calculator

# Save logs to file
docker logs tco-calculator > calculator.log 2>&1
```

### Backup & Recovery
```bash
# Backup configuration
tar -czf backup-$(date +%Y%m%d).tar.gz *.html *.css *.js *.json

# Restore from backup
tar -xzf backup-20250818.tar.gz
```

## Performance Optimization
### CDN Integration
1. Upload static files to CDN
2. Update HTML to use CDN URLs
3. Configure cache headers

### Caching Strategy
```nginx
# Add to nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## Security Best Practices

### 1. Update Dependencies
```bash
# Check for vulnerabilities
npm audit

# Update packages
npm update
```

### 2. Environment Variables
- Never commit .env files
- Use secrets management in production
- Rotate keys regularly

### 3. Network Security
```bash
# Configure firewall
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :5000
# Kill process
kill -9 <PID>
```

#### Container Won't Start
```bash
# Check logs
docker logs tco-calculator

# Inspect container
docker inspect tco-calculator

# Remove and recreate
docker rm -f tco-calculator
docker-compose up --build
```

#### Memory Issues
```bash
# Increase memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
```

## Support

For issues or questions:
1. Check logs first
2. Review this guide
3. Create GitHub issue
4. Contact support team

---
*Last updated: August 2025*