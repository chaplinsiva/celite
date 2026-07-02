import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  showRememberMe?: boolean;
  additionalFields?: React.ReactNode;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-zinc-200 bg-white transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 shadow-sm hover:border-zinc-300">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-4 rounded-3xl bg-white border border-zinc-100 p-6 w-72 shadow-xl shadow-blue-900/5`}>
    <img src={testimonial.avatarSrc} className="h-12 w-12 object-cover rounded-full border-2 border-white shadow-md bg-zinc-100" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-semibold text-zinc-900">{testimonial.name}</p>
      <p className="text-blue-600 font-medium text-xs">{testimonial.handle}</p>
      <p className="mt-2 text-zinc-600 leading-relaxed font-light">"{testimonial.text}"</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-bold text-zinc-900 tracking-tight">Welcome Back</span>,
  description = "Access your account and continue your creative journey",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  isSubmitting = false,
  error = null,
  showRememberMe = true,
  additionalFields,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 h-screen w-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8 bg-white md:bg-zinc-50/50">
        <div className="w-full max-w-md bg-white md:p-10 md:rounded-3xl md:shadow-2xl md:shadow-blue-900/5 md:border md:border-white">
          <div className="flex flex-col gap-8">
            <div className="text-center md:text-left">
              <h1 className="animate-element animate-delay-100 text-3xl md:text-4xl font-bold leading-tight text-zinc-900 tracking-tight">{title}</h1>
              <p className="animate-element animate-delay-200 text-zinc-500 mt-2 text-lg">{description}</p>
            </div>

            {error && (
              <div className="animate-element animate-delay-250 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={onSignIn}>
              {additionalFields}

              <div className="animate-element animate-delay-300">
                <label className="text-sm font-semibold text-zinc-700 mb-2 block ml-1">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" className="w-full bg-transparent text-zinc-900 text-base p-4 rounded-2xl focus:outline-none placeholder-zinc-400" autoComplete="email" required />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-semibold text-zinc-700 mb-2 block ml-1">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-transparent text-zinc-900 text-base p-4 pr-12 rounded-2xl focus:outline-none placeholder-zinc-400" autoComplete="current-password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-zinc-400 hover:text-zinc-600 transition-colors" /> : <Eye className="w-5 h-5 text-zinc-400 hover:text-zinc-600 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {showRememberMe && (
                <div className="animate-element animate-delay-500 flex items-center justify-between text-sm px-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="rememberMe" className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    <span className="text-zinc-600 group-hover:text-zinc-900 transition-colors font-medium">Keep me signed in</span>
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">Reset password?</a>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="animate-element animate-delay-600 w-full rounded-2xl bg-blue-600 py-4 font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 text-lg">
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center py-2">
              <span className="w-full border-t border-zinc-200"></span>
              <span className="px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-white md:bg-zinc-50/50 absolute">Or continue with</span>
              <span className="px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-white md:hidden absolute">Or continue with</span>

            </div>

            <button onClick={onGoogleSignIn} disabled={isSubmitting} className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-zinc-200 bg-white rounded-2xl py-4 hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm text-zinc-700 font-semibold text-base">
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-zinc-500 font-medium">
              {additionalFields ? (
                <>Already have a Celite account? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors">Log in</a></>
              ) : (
                <>New to our platform? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors">Create Account</a></>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden lg:block flex-1 relative bg-zinc-50">
          <div className="absolute inset-4 rounded-[2.5rem] bg-cover bg-center shadow-2xl overflow-hidden" style={{ backgroundImage: `url(${heroImageSrc})` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

            {testimonials.length > 0 && (
              <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 px-12 pb-8">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 shadow-xl">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-3">
                      {testimonials.map((t, i) => (
                        <img key={i} src={t.avatarSrc} className="w-8 h-8 rounded-full border-2 border-white" alt={t.name} />
                      ))}
                    </div>
                    <span className="text-white text-sm font-medium pl-2">Trusted by 10,000+ top creators</span>
                  </div>
                </div>

                <div className="flex gap-6 w-full justify-center perspective-1000">
                  <div className="transform hover:-translate-y-2 transition-transform duration-300">
                    <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                  </div>
                  {testimonials[1] && (
                    <div className="transform translate-y-8 hover:translate-y-6 transition-transform duration-300 hidden xl:block">
                      <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Subtle decoration */}
          <div className="absolute top-12 right-12 w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full blur-2xl"></div>
          <div className="absolute bottom-12 left-12 w-32 h-32 bg-blue-500/20 backdrop-blur-xl rounded-full blur-3xl"></div>
        </section>
      )}
    </div>
  );
};

