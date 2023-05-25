const { performance } = require('perf_hooks');

// Measure the performance of the availableShifts query
function measureAvailableShiftsPerformance() {
    const start = performance.now();

    // Make the availableShifts query here
    // ...

    const end = performance.now();
    const executionTime = end - start;

    // Log the execution time
    console.log(`Execution time of availableShifts query: ${executionTime} milliseconds`);

    // Generate a brief performance report
    const report = {
        query: 'availableShifts',
        executionTime: `${executionTime} milliseconds`,
        // Add additional metrics or information to the report as needed
    };

    // Log the performance report
    console.log('Performance Report:');
    console.log(report);
}

// Call the function to measure the performance
measureAvailableShiftsPerformance();
