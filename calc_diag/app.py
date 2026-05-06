from flask import Flask, request, jsonify, render_template
import sympy as sp
from sympy.matrices.common import NonInvertibleMatrixError
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/diagonalize', methods=['POST'])
def diagonalize():
    try:
        data = request.json
        if not data or 'matrix' not in data:
            return jsonify({"error": "Matrix data is missing"}), 400

        # Parse the 3x3 matrix from the input
        # Input should be a list of lists of floats or ints
        matrix_data = data['matrix']
        
        # Convert to sympy Matrix
        # Using rational approximation or keeping exact if they are integers
        sympy_matrix = []
        for row in matrix_data:
            sympy_row = []
            for val in row:
                try:
                    # Try parsing as integer first
                    if '.' not in str(val):
                        sympy_row.append(sp.Integer(int(val)))
                    else:
                        # Convert float to Rational for exact symbolic computation
                        sympy_row.append(sp.nsimplify(float(val), rational=True))
                except Exception:
                    return jsonify({"error": f"Invalid value '{val}'. Please enter valid numbers."}), 400
            sympy_matrix.append(sympy_row)

        A = sp.Matrix(sympy_matrix)

        if A.rows != A.cols:
            return jsonify({"error": "Matrix must be square (m x m)"}), 400

        # Characteristic equation det(A - lambda*I) = 0
        lam = sp.Symbol('lambda')
        char_poly = (A - lam * sp.eye(A.rows)).det()
        char_poly = sp.simplify(char_poly)
        char_eq_latex = sp.latex(sp.Eq(char_poly, 0))

        # Eigenvalues
        eigenvals_raw = A.eigenvals()
        # Sort eigenvalues for consistent output (ascending order by real part)
        sorted_eigenvals = sorted(eigenvals_raw.items(), key=lambda x: sp.re(x[0]))
        
        eigenvals_latex = []
        for val, mult in sorted_eigenvals:
            eigenvals_latex.append(f"\\lambda = {sp.latex(val)} \\text{{ (multiplicity: }} {mult} \\text{{)}}")

        # Eigenvectors
        eigenvects_raw = A.eigenvects()
        sorted_eigenvects = sorted(eigenvects_raw, key=lambda x: sp.re(x[0]))
        
        eigenvects_latex = []
        for val, mult, vects in sorted_eigenvects:
            vects_str = ", ".join([sp.latex(v) for v in vects])
            eigenvects_latex.append(f"\\lambda = {sp.latex(val)} \\rightarrow {vects_str}")

        # Try to diagonalize
        try:
            # Build P and D manually to guarantee sorted order matches the display
            P_cols = []
            D_diag = []
            for val, mult, vects in sorted_eigenvects:
                for v in vects:
                    P_cols.append(v)
                    D_diag.append(val)
                    
            if len(P_cols) == A.rows:
                P = sp.Matrix.hstack(*P_cols)
                D = sp.diag(*D_diag)
                P_latex = sp.latex(P)
                D_latex = sp.latex(D)
                
                # Verification: A = P D P^-1 and P^-1 A P = D
                P_inv = P.inv()
                P_inv_latex = sp.latex(P_inv)
                A_latex = sp.latex(A)
                
                verification_step1 = f"A = P D P^{{-1}} = {P_latex} {D_latex} {P_inv_latex}"
                verification_step2 = f"= {A_latex}"
                verification_step3 = f"P^{{-1}} A P = {D_latex}"
            else:
                raise sp.MatrixError("Matrix is not diagonalizable")
            
            is_diagonalizable = True
            error_msg = ""
            
        except sp.MatrixError as e:
            is_diagonalizable = False
            P_latex = ""
            D_latex = ""
            P_inv_latex = ""
            verification_step1 = ""
            verification_step2 = ""
            verification_step3 = ""
            error_msg = "Matrix is not diagonalizable (not enough independent eigenvectors)."

        result = {
            "matrix_latex": sp.latex(A),
            "char_eq_latex": char_eq_latex,
            "eigenvals_latex": eigenvals_latex,
            "eigenvects_latex": eigenvects_latex,
            "is_diagonalizable": is_diagonalizable,
            "error_msg": error_msg,
        }

        if is_diagonalizable:
            result.update({
                "P_latex": P_latex,
                "D_latex": D_latex,
                "verification": [verification_step1, verification_step2, verification_step3]
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
