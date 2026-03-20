@echo off
echo 🚀 Starting Voting App...
echo.

echo 📦 Installing dependencies...
npm install

echo.
echo 🖥️ Starting Backend...
start "Backend" cmd /k "npm run api"

echo.
echo ✅ Backend starting on http://localhost:5000
echo 🌐 Test with: curl http://localhost:5000/api/health
echo.
echo 📝 Press any key to stop...
pause
