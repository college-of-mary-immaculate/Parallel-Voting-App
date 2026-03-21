import { loginRequest } from '../api.js';
import { saveAuth } from '../auth.js';
import { navigate } from '../router.js';

export function LoginPage() {
    const div = document.createElement('div');
    div.className = 'card';

    div.innerHTML = `
        <h2>Login</h2>
        <div class="error" id="error"></div>
        <input type="email" id="email" placeholder="Email" />
        <input type="password" id="password" placeholder="Password" />
        <button id="loginBtn">Login</button>
    `;

    div.querySelector('#loginBtn').addEventListener('click', async () => {
        const email = div.querySelector('#email').value;
        const password = div.querySelector('#password').value;
        const errorDiv = div.querySelector('#error');

        try {
            const data = await loginRequest(email, password);
            saveAuth(data);

            // Redirect based on role
            const role = data.user.role;
            if (role === 'Admin') {
                navigate('/dashboard');  // Admin dashboard
            } else if (role === 'Voter') {
                navigate('/voter');      // Voter page
            } else {
                errorDiv.textContent = 'Unknown role';
            }

        } catch (err) {
            errorDiv.textContent = err.message;
        }
    });

    return div;
}