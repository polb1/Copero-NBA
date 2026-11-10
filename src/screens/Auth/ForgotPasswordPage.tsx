'use client';

export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Recuperar contraseña</h1>
          <p className="text-gray-400">Te enviaremos un enlace para restablecerla</p>
        </div>
        <div id="forgot-form-root"></div>
      </div>
    </div>
  );
}