// Test script to simulate user interaction with Environmental Impact chart
const puppeteer = require('puppeteer');

async function testEnvironmentalChart() {
    console.log('🧪 Starting Environmental Impact Chart Test...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true 
    });
    
    const page = await browser.newPage();
    
    // Listen to console logs from the page
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error') {
            console.log('🔴 Browser Error:', text);
        } else if (text.includes('Environmental') || text.includes('🌱') || text.includes('environmental')) {
            console.log('🌱 Environmental Log:', text);
        } else if (text.includes('Chart') || text.includes('📊')) {
            console.log('📊 Chart Log:', text);
        }
    });
    
    try {
        console.log('🌐 Navigating to TCO Calculator...');
        await page.goto('http://localhost:4000', { waitUntil: 'networkidle0' });
        
        console.log('🧮 Triggering calculation...');
        await page.click('button.calculate-btn');
        
        console.log('⏱️ Waiting for results...');
        await page.waitForSelector('#resultsContent', { visible: true, timeout: 10000 });
        
        console.log('🔄 Switching to Environmental Impact view...');
        await page.click('#btn-environmental');
        
        console.log('⏱️ Waiting for environmental chart...');
        await page.waitForTimeout(2000);
        
        // Check if environmental chart canvas exists and has content
        const canvasExists = await page.$('#activeChart');
        console.log('📋 Active chart canvas exists:', !!canvasExists);
        
        // Check if grid view works
        console.log('🔄 Switching to grid view...');
        await page.click('#btn-grid');
        await page.waitForTimeout(2000);
        
        const envCanvasExists = await page.$('#environmentalChart');
        console.log('📋 Environmental chart canvas exists in grid:', !!envCanvasExists);
        
        // Get any error messages
        const errorLogs = await page.evaluate(() => {
            return window.console.errorLogs || [];
        });
        
        if (errorLogs.length > 0) {
            console.log('❌ Found error logs:', errorLogs);
        } else {
            console.log('✅ No JavaScript errors detected');
        }
        
        console.log('⏱️ Keeping browser open for manual inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
        console.log('🧪 Test completed');
    }
}

// Check if puppeteer is available, if not provide manual test instructions
try {
    testEnvironmentalChart();
} catch (error) {
    console.log('ℹ️ Puppeteer not available. Manual test instructions:');
    console.log('1. Open http://localhost:4000 in your browser');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Console tab');
    console.log('4. Click "Calculate TCO & Savings" button');
    console.log('5. Click "🌱 Environmental Impact" button');
    console.log('6. Check console for debug messages starting with 🌱, 📊, or ❌');
    console.log('7. If chart is not visible, try clicking "⊞ All Charts" and look for environmental chart');
}