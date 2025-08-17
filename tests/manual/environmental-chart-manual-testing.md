# Environmental Impact Chart Manual Testing Procedures

## Overview
This document provides comprehensive manual testing procedures for validating the Environmental Impact chart display fix in the TCO Calculator application. These tests ensure the resolution of "исправь отображение environmental impact, я не вижу его" and prevent future regressions.

## Prerequisites
- TCO Calculator application running at http://localhost:4000
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Developer Tools available for debugging
- Test data sets for various scenarios

## Testing Environment Setup

### 1. Application Startup Verification
- [ ] Open http://localhost:4000 in browser
- [ ] Verify page loads without JavaScript errors
- [ ] Confirm all form elements are visible and functional
- [ ] Check that Chart.js library is loaded (inspect Network tab)

### 2. Browser Developer Tools Setup
- [ ] Open Developer Tools (F12)
- [ ] Go to Console tab to monitor debug messages
- [ ] Look for Chart.js library loaded confirmation
- [ ] Verify no initial JavaScript errors

## Core Functionality Tests

### Test 1: Basic Environmental Chart Display
**Objective**: Verify environmental impact chart displays correctly

**Steps**:
1. Fill in calculation form:
   - Servers: 100
   - Power per Server: 300W
   - PUE Air Cooling: 1.65
   - PUE Immersion Cooling: 1.01
   - Electricity Cost: $0.15/kWh
   - Floor Space Cost: $25/sq ft

2. Click "Calculate TCO & Savings" button
3. Wait for results to display
4. Click "🌱 Environmental Impact" button

**Expected Results**:
- [ ] Environmental chart becomes visible immediately
- [ ] Chart displays as a doughnut/pie chart
- [ ] Chart shows two segments: "Air Cooling PUE" and "Immersion Cooling PUE"
- [ ] PUE values are displayed correctly (1.65 and 1.01)
- [ ] Chart has professional color scheme
- [ ] Chart title is visible and descriptive

**Console Logs to Look For**:
- [ ] "🌱 Creating Environmental Impact chart..."
- [ ] "📊 Environmental chart created successfully"
- [ ] No error messages containing "Environmental chart creation failed"

### Test 2: Chart Switching Functionality
**Objective**: Verify smooth switching between chart types

**Steps**:
1. Complete Test 1 to get to results display
2. Click "📊 Pie Chart" button
3. Click "💰 Savings" button  
4. Click "🌱 Environmental Impact" button
5. Repeat switching sequence 3 times

**Expected Results**:
- [ ] Each chart switch occurs within 1 second
- [ ] Environmental chart consistently displays correctly
- [ ] No visual glitches or blank charts
- [ ] Chart animations are smooth
- [ ] Previous chart is properly destroyed before new one loads

**Console Logs to Look For**:
- [ ] "🗑️ Destroying environmental chart" when switching away
- [ ] "🌱 Creating environmental chart in single view..." when switching back
- [ ] No memory leak warnings

### Test 3: Grid View Display
**Objective**: Verify environmental chart works in grid view

**Steps**:
1. Complete calculation and get results
2. Click "⊞ All Charts" button
3. Wait for grid view to load
4. Locate environmental chart in grid

**Expected Results**:
- [ ] Environmental chart appears in grid alongside other charts
- [ ] Chart is properly sized within its grid container
- [ ] Chart maintains visual quality in smaller size
- [ ] All three charts (Pie, Savings, Environmental) are visible
- [ ] Grid layout is responsive and well-organized

**Console Logs to Look For**:
- [ ] "🌱 Creating environmental chart in grid view..."
- [ ] "📊 Grid charts creation results:" with environmental: true

### Test 4: Grid to Single View Switching
**Objective**: Verify seamless transition between grid and single views

**Steps**:
1. Start in grid view (from Test 3)
2. Click "🌱 Environmental Impact" button to switch to single view
3. Click "⊞ All Charts" to return to grid view
4. Click "📊 Pie Chart" to switch to pie chart single view
5. Click "🌱 Environmental Impact" to return to environmental single view

**Expected Results**:
- [ ] All transitions are smooth and quick (< 2 seconds)
- [ ] Environmental chart maintains data consistency
- [ ] Chart quality is preserved in all view modes
- [ ] No visual artifacts or rendering issues

## Responsive Design Tests

### Test 5: Mobile Viewport Testing
**Objective**: Verify environmental chart works on mobile devices

**Steps**:
1. Open Developer Tools
2. Toggle device simulation (Ctrl+Shift+M)
3. Select iPhone SE (375x667)
4. Complete basic calculation
5. View environmental chart in single view
6. Test grid view

**Expected Results**:
- [ ] Chart fits within mobile viewport
- [ ] Chart remains readable and interactive
- [ ] Touch interactions work properly
- [ ] Grid view adapts to smaller screen
- [ ] All buttons remain accessible

### Test 6: Tablet Viewport Testing
**Objective**: Verify environmental chart works on tablet devices

**Steps**:
1. Set viewport to iPad (768x1024)
2. Test both portrait and landscape orientations
3. Complete calculation and view environmental chart
4. Test grid view functionality

**Expected Results**:
- [ ] Chart scales appropriately for tablet size
- [ ] Grid view shows all charts clearly
- [ ] Touch targets are appropriately sized
- [ ] Layout remains professional and readable

### Test 7: Desktop Responsive Testing
**Objective**: Verify environmental chart works across desktop resolutions

**Steps**:
1. Test at various desktop resolutions:
   - 1024x768 (Small desktop)
   - 1366x768 (Standard laptop)
   - 1920x1080 (Full HD)
   - 2560x1440 (QHD)

**Expected Results**:
- [ ] Chart scales appropriately at all resolutions
- [ ] Grid view utilizes available space effectively
- [ ] Text and labels remain readable
- [ ] Professional appearance maintained

## Error Handling Tests

### Test 8: Invalid Data Handling
**Objective**: Verify chart handles invalid inputs gracefully

**Steps**:
1. Enter invalid data:
   - Servers: -1
   - Power per Server: 0
   - PUE values: 0 or negative numbers
2. Click Calculate
3. Attempt to view environmental chart

**Expected Results**:
- [ ] Application doesn't crash
- [ ] Appropriate error messages are displayed
- [ ] Chart either shows fallback content or helpful error message
- [ ] User can recover by entering valid data

### Test 9: Network Interruption Testing
**Objective**: Verify chart works with poor network conditions

**Steps**:
1. Open Network tab in Developer Tools
2. Throttle connection to "Slow 3G"
3. Reload page and complete calculation
4. View environmental chart

**Expected Results**:
- [ ] Chart loads despite slow connection
- [ ] Loading indicators are appropriate
- [ ] No broken functionality due to timing issues

### Test 10: JavaScript Error Recovery
**Objective**: Verify application recovers from JavaScript errors

**Steps**:
1. Open Console tab
2. Inject error: `window.Chart = undefined`
3. Try to view environmental chart
4. Reload page to restore functionality

**Expected Results**:
- [ ] Application handles missing Chart.js gracefully
- [ ] Fallback mechanisms activate
- [ ] User receives helpful feedback
- [ ] Recovery is possible without data loss

## Performance Tests

### Test 11: Rapid Chart Switching Performance
**Objective**: Verify performance under rapid user interactions

**Steps**:
1. Complete calculation
2. Rapidly click between chart buttons for 30 seconds
3. Monitor browser performance and responsiveness

**Expected Results**:
- [ ] Application remains responsive throughout
- [ ] No significant memory usage increase
- [ ] Charts continue to display correctly
- [ ] No visual lag or performance degradation

### Test 12: Extended Usage Testing
**Objective**: Verify chart works during extended sessions

**Steps**:
1. Perform multiple calculations (10+ iterations)
2. Switch between views frequently
3. Monitor memory usage in Performance tab

**Expected Results**:
- [ ] Memory usage remains stable
- [ ] Chart functionality doesn't degrade
- [ ] Performance remains consistent
- [ ] No memory leaks detected

## Cross-Browser Compatibility Tests

### Test 13: Chrome Testing
**Browser**: Google Chrome (latest version)

**Steps**:
1. Complete all core functionality tests
2. Test responsive design
3. Verify performance characteristics

**Expected Results**:
- [ ] All functionality works perfectly
- [ ] Chart.js renders correctly
- [ ] Performance is optimal

### Test 14: Firefox Testing
**Browser**: Mozilla Firefox (latest version)

**Steps**:
1. Repeat all core tests
2. Pay attention to canvas rendering differences
3. Test chart interactions

**Expected Results**:
- [ ] Environmental chart displays correctly
- [ ] No Firefox-specific issues
- [ ] Canvas performance is acceptable

### Test 15: Safari Testing
**Browser**: Safari (latest version)

**Steps**:
1. Test all functionality
2. Focus on WebKit-specific behaviors
3. Test mobile Safari if available

**Expected Results**:
- [ ] Charts render correctly in WebKit
- [ ] Touch interactions work on mobile Safari
- [ ] No Safari-specific bugs

### Test 16: Edge Testing
**Browser**: Microsoft Edge (latest version)

**Steps**:
1. Complete functionality tests
2. Test Chart.js compatibility
3. Verify responsive behavior

**Expected Results**:
- [ ] Full compatibility with Edge
- [ ] No Chromium-edge specific issues
- [ ] Professional appearance maintained

## Accessibility Tests

### Test 17: Keyboard Navigation
**Objective**: Verify chart is accessible via keyboard

**Steps**:
1. Use only keyboard navigation (Tab, Enter, Space)
2. Navigate to environmental chart button
3. Activate chart using keyboard
4. Test focus management

**Expected Results**:
- [ ] All interactive elements are reachable via keyboard
- [ ] Focus indicators are visible
- [ ] Chart button can be activated with Enter/Space
- [ ] Tab order is logical

### Test 18: Screen Reader Compatibility
**Objective**: Verify chart provides appropriate accessibility information

**Steps**:
1. Use screen reader software (NVDA, JAWS, or VoiceOver)
2. Navigate to environmental chart
3. Listen to announcements

**Expected Results**:
- [ ] Chart button has descriptive label
- [ ] Chart content is announced appropriately
- [ ] Alternative text descriptions are available
- [ ] Data values are accessible

## User Experience Tests

### Test 19: First-Time User Experience
**Objective**: Verify intuitive use for new users

**Steps**:
1. Have someone unfamiliar with the app try to:
   - Complete a calculation
   - Find and view the environmental chart
   - Understand the chart's meaning

**Expected Results**:
- [ ] Environmental chart is discoverable
- [ ] Chart purpose is clear from visual design
- [ ] Data representation is intuitive
- [ ] No confusion about how to access chart

### Test 20: Professional Presentation
**Objective**: Verify chart meets enterprise presentation standards

**Steps**:
1. View environmental chart in full-screen
2. Assess visual design and data presentation
3. Evaluate suitability for executive presentations

**Expected Results**:
- [ ] Professional color scheme and typography
- [ ] Clear, readable labels and values
- [ ] Appropriate chart type for data
- [ ] Enterprise-quality visual design

## Validation Checklist

### Pre-Test Setup
- [ ] Application server is running
- [ ] Browser is updated to latest version
- [ ] Developer Tools are available
- [ ] Test data is prepared

### Core Functionality Validation
- [ ] Environmental chart displays when button is clicked
- [ ] Chart shows correct PUE data (Air vs Immersion cooling)
- [ ] Chart switching works smoothly
- [ ] Grid view includes environmental chart
- [ ] Single/grid view transitions work correctly

### Visual Quality Validation
- [ ] Chart uses professional color scheme
- [ ] Text is readable at all sizes
- [ ] Chart proportions are correct
- [ ] Visual design matches application theme

### Performance Validation
- [ ] Chart creation time < 2 seconds
- [ ] Memory usage remains stable
- [ ] Rapid interactions don't cause lag
- [ ] Extended usage doesn't degrade performance

### Cross-Browser Validation
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

### Responsive Design Validation
- [ ] Works on mobile devices (320px+)
- [ ] Works on tablets (768px+)
- [ ] Works on desktop (1024px+)
- [ ] Adapts to orientation changes

### Error Handling Validation
- [ ] Handles invalid data gracefully
- [ ] Recovers from JavaScript errors
- [ ] Provides helpful error messages
- [ ] Maintains application stability

### Accessibility Validation
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Appropriate ARIA labels
- [ ] Focus management is correct

## Bug Reporting Template

If issues are found during manual testing, use this template:

**Bug Title**: [Brief description of issue]

**Severity**: Critical / High / Medium / Low

**Browser**: [Browser name and version]

**Viewport**: [Screen size or device]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]

**Actual Result**: [What actually happens]

**Console Errors**: [Any JavaScript errors]

**Screenshots**: [If applicable]

**Workaround**: [If available]

## Test Completion Sign-off

**Test Date**: _______________

**Tester Name**: _______________

**Browser/Device Tested**: _______________

**Overall Result**: Pass / Fail / Pass with Minor Issues

**Critical Issues Found**: _______________

**Recommendations**: _______________

**Sign-off**: _______________

---

## Notes for Testers

1. **Console Monitoring**: Always keep Developer Tools open to monitor for JavaScript errors and debug messages
2. **Performance Awareness**: Pay attention to chart loading times and responsiveness
3. **Visual Quality**: Ensure charts maintain professional appearance across all test scenarios
4. **User Perspective**: Think from the end-user's perspective - is the environmental chart easy to find and understand?
5. **Documentation**: Document any unexpected behavior, even if it doesn't seem critical

## Success Criteria

The Environmental Impact chart display fix is considered successful if:

- ✅ Environmental chart is always visible when button is clicked
- ✅ Chart displays correct PUE comparison data
- ✅ Chart works in both single and grid views
- ✅ Performance is acceptable across all browsers
- ✅ Responsive design works on all device sizes
- ✅ Error handling is robust and user-friendly
- ✅ Visual quality meets professional standards
- ✅ Accessibility requirements are met

**Final Validation**: The original issue "исправь отображение environmental impact, я не вижу его" is resolved when users can consistently see and interact with the environmental impact chart across all supported browsers and devices.