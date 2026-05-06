document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculate-btn');
    const loading = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    const errorContainer = document.getElementById('error-container');
    const diagonalizableResults = document.getElementById('diagonalizable-results');
    const sizeInput = document.getElementById('matrix-size');
    const matrixGrid = document.getElementById('matrix-grid');

    // Generate grid initially
    generateGrid(parseInt(sizeInput.value));

    // Handle Size Change
    sizeInput.addEventListener('change', (e) => {
        let size = parseInt(e.target.value);
        if (size < 2) { size = 2; sizeInput.value = 2; }
        if (size > 10) { size = 10; sizeInput.value = 10; } // Hard limit
        generateGrid(size);
    });

    // Handle Calculate Button Click
    calculateBtn.addEventListener('click', async () => {
        const size = parseInt(sizeInput.value);
        // Collect matrix data
        const matrix = [];
        for (let i = 1; i <= size; i++) {
            const row = [];
            for (let j = 1; j <= size; j++) {
                const inputEl = document.getElementById(`a${i}${j}`);
                if (!inputEl) continue;
                const val = inputEl.value;
                if (val === '') {
                    showError(`Please fill in all matrix elements (missing a${i}${j})`);
                    return;
                }
                row.push(val);
            }
            matrix.push(row);
        }

        // Show loading state
        calculateBtn.disabled = true;
        loading.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        errorContainer.classList.add('hidden');

        try {
            const response = await fetch('/api/diagonalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ matrix })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to calculate');
            }

            displayResults(data);

        } catch (error) {
            showError(error.message);
        } finally {
            calculateBtn.disabled = false;
            loading.classList.add('hidden');
        }
    });

    function generateGrid(size) {
        matrixGrid.innerHTML = '';
        matrixGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

        for (let i = 1; i <= size; i++) {
            for (let j = 1; j <= size; j++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.id = `a${i}${j}`;
                input.step = 'any';
                input.required = true;
                input.placeholder = `a${i}${j}`;
                matrixGrid.appendChild(input);
            }
        }
    }
});

// Function to load example matrices
window.loadExample = function (values) {
    const size = Math.sqrt(values.length);
    if (!Number.isInteger(size)) {
        console.error("Invalid example matrix values");
        return;
    }

    // Update size input and regenerate grid
    const sizeInput = document.getElementById('matrix-size');
    sizeInput.value = size;

    // Dispatch change event to trigger grid regeneration
    sizeInput.dispatchEvent(new Event('change'));

    // Fill the values
    let index = 0;
    for (let i = 1; i <= size; i++) {
        for (let j = 1; j <= size; j++) {
            document.getElementById(`a${i}${j}`).value = values[index];
            index++;
        }
    }
}

function showError(message) {
    const errorContainer = document.getElementById('error-container');
    const resultsSection = document.getElementById('results-section');

    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
    resultsSection.classList.remove('hidden');
}

function displayResults(data) {
    const resultsSection = document.getElementById('results-section');
    const errorContainer = document.getElementById('error-container');
    const diagonalizableResults = document.getElementById('diagonalizable-results');

    resultsSection.classList.remove('hidden');

    if (data.error_msg) {
        errorContainer.textContent = data.error_msg;
        errorContainer.classList.remove('hidden');
    } else {
        errorContainer.classList.add('hidden');
    }

    // Set MathJax content
    document.getElementById('res-matrix').innerHTML = `\\[ A = ${data.matrix_latex} \\]`;
    document.getElementById('res-char-eq').innerHTML = `\\[ ${data.char_eq_latex} \\]`;

    // Eigenvalues
    const eigenvalsHtml = data.eigenvals_latex.map(val => `\\[ ${val} \\]`).join('');
    document.getElementById('res-eigenvals').innerHTML = eigenvalsHtml;

    // Eigenvectors
    const eigenvectsHtml = data.eigenvects_latex.map(val => `\\[ ${val} \\]`).join('');
    document.getElementById('res-eigenvects').innerHTML = eigenvectsHtml;

    if (data.is_diagonalizable) {
        diagonalizableResults.classList.remove('hidden');
        document.getElementById('res-modal').innerHTML = `\\[ P = ${data.P_latex} \\]`;
        document.getElementById('res-diagonal').innerHTML = `\\[ D = ${data.D_latex} \\]`;

        const verifyHtml = data.verification.map(step => `\\[ ${step} \\]`).join('');
        document.getElementById('res-verify').innerHTML = verifyHtml;
    } else {
        diagonalizableResults.classList.add('hidden');
    }

    // Trigger MathJax to re-render
    if (window.MathJax) {
        MathJax.typesetPromise().catch((err) => console.error('MathJax error:', err));
    }
}
