import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to ClaimFlow
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            HIPAA-compliant insurance claims management with AI-powered OCR, 
            medical coding assistance, and secure claim tracking.
          </p>
          
          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg border border-blue-600 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">Smart OCR</h3>
              <p className="text-gray-600">
                Upload insurance cards and receipts for automatic data extraction
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI Assistance</h3>
              <p className="text-gray-600">
                Get AI-powered CPT/ICD code suggestions and claim validation
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">HIPAA Secure</h3>
              <p className="text-gray-600">
                Your health information is encrypted and protected
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}