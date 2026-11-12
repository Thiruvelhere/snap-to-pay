
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const steps = [
  {
    number: "01",
    title: "Snap",
    description: "Capture a product or upload an image.",
  },
  {
    number: "02",
    title: "Identify",
    description: "Let AI recognise products from your catalogue.",
  },
  {
    number: "03",
    title: "Checkout",
    description: "Review your cart and generate a payment QR.",
  },
];

export default function Home() {
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // Hero entrance animation
      const intro = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      intro
        .from(".hero-kicker", {
          y: 25,
          opacity: 0,
          duration: 0.8,
        })
        .from(
          ".hero-title",
          {
            y: 75,
            opacity: 0,
            duration: 1.1,
          },
          "-=0.45"
        )
        .from(
          ".hero-copy, .hero-actions",
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
          },
          "-=0.55"
        )
        .from(
          ".hero-visual",
          {
            y: 90,
            opacity: 0,
            scale: 0.94,
            duration: 1.2,
          },
          "-=0.4"
        );

      // Background parallax
      gsap.to(".ambient-one", {
        y: 250,
        x: 80,
        scale: 1.3,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      gsap.to(".ambient-two", {
        y: -180,
        x: -70,
        scale: 1.2,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: 2,
        },
      });

      gsap.to(".ambient-three", {
        y: -220,
        x: 90,
        scale: 1.25,
        ease: "none",
        scrollTrigger: {
          trigger: "#how-it-works",
          start: "top bottom",
          end: "bottom top",
          scrub: 2,
        },
      });

      // Hero visual scroll transition
      gsap.to(".hero-visual", {
        y: -100,
        scale: 0.9,
        opacity: 0.35,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "center center",
          end: "bottom top",
          scrub: 1,
        },
      });

      // General section reveal
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
        gsap.from(element, {
          y: 65,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        });
      });

      // Workflow stagger animation
      gsap.from(".step-item", {
        y: 80,
        opacity: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".workflow-grid",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      // Feature panel reveal
      gsap.from(".feature-panel", {
        y: 90,
        opacity: 0,
        scale: 0.96,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".feature-panel",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      // Final CTA entrance
      gsap.from(".final-cta", {
        y: 70,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".final-cta",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      ScrollTrigger.refresh();
    }, pageRef);

    return () => {
      ctx.revert();
      lenis.destroy();
      gsap.ticker.remove(ticker);
    };
  }, []);

  return (
    <main
      ref={pageRef}
      className="relative min-h-screen overflow-hidden bg-[#100B16] text-[#F8EFF8]"
    >
      <style>{`
        html {
          scroll-behavior: auto;
        }

        .ambient {
          position: absolute;
          border-radius: 9999px;
          filter: blur(100px);
          opacity: .27;
          pointer-events: none;
          animation: drift 14s ease-in-out infinite alternate;
          will-change: transform;
        }

        .ambient-one {
          width: 440px;
          height: 440px;
          background: #C45AAB;
          top: -180px;
          left: -130px;
        }

        .ambient-two {
          width: 480px;
          height: 480px;
          background: #7954D8;
          top: 100px;
          right: -190px;
          animation-delay: -5s;
        }

        .ambient-three {
          width: 380px;
          height: 380px;
          background: #A45DCE;
          bottom: -180px;
          left: 35%;
          animation-delay: -9s;
        }

        @keyframes drift {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(45px, 35px, 0) scale(1.2);
          }
        }

        .gradient-text {
          background: linear-gradient(
            105deg,
            #F3B7DC 5%,
            #C9A5F5 55%,
            #A99BFF 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .soft-grid {
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(to bottom, black, transparent 80%);
        }

        .float-card {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        .glass {
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.09);
          backdrop-filter: blur(18px);
        }

        @media (max-width: 640px) {
          .ambient {
            filter: blur(75px);
          }

          .ambient-one {
            width: 300px;
            height: 300px;
          }

          .ambient-two {
            width: 320px;
            height: 320px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="ambient ambient-three" />
        <div className="soft-grid absolute inset-0" />
      </div>

      {/* Navigation */}
      <header className="relative z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            snap<span className="gradient-text">.</span>to
            <span className="text-[#DCA8DF]">.</span>pay
          </Link>

          <div className="hidden items-center gap-9 text-sm text-[#B9A9BE] sm:flex">
            <a
              href="#how-it-works"
              className="transition hover:text-white"
            >
              How it works
            </a>
            <a
              href="#features"
              className="transition hover:text-white"
            >
              Features
            </a>
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm text-[#D5C5DA] transition hover:text-white"
            >
              Sign in
            </Link>

            <Link
              href="/register"
              className="rounded-full bg-[#E9B4D9] px-5 py-2.5 text-sm font-semibold text-[#27172A] transition hover:bg-[#F4C9E6]"
            >
              Get started ↗
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero-section relative z-10 mx-auto flex min-h-[690px] max-w-6xl flex-col items-center justify-center px-6 pb-20 pt-16 text-center">
        <div className="hero-kicker mb-8 inline-flex items-center gap-2 rounded-full border border-[#DCA8DF]/20 bg-[#DCA8DF]/[0.07] px-4 py-2 text-[10px] font-medium tracking-[0.2em] text-[#E6BCE7]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E9B4D9]" />
          A NEW WAY TO SELL
        </div>

        <h1 className="hero-title max-w-4xl text-5xl font-medium leading-[1.12] tracking-[-0.055em] sm:text-7xl lg:text-[88px]">
          Selling should feel
          <br />
          as simple as a{" "}
          <span className="gradient-text italic">snap.</span>
        </h1>

        <p className="hero-copy mt-8 max-w-lg text-sm leading-7 text-[#B7A8BC] sm:text-base">
          From identifying products with AI to collecting payments through QR
          checkout. Everything you need to sell, in one simple experience.
        </p>

        <div className="hero-actions mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-full bg-[#E9B4D9] px-7 py-3.5 text-sm font-semibold text-[#27172A] transition duration-300 hover:-translate-y-1 hover:bg-[#F4C9E6]"
          >
            Start selling ↗
          </Link>

          <a
            href="#how-it-works"
            className="rounded-full border border-white/15 px-7 py-3.5 text-sm text-[#E8DCEB] transition duration-300 hover:border-[#DCA8DF]/50 hover:bg-white/[0.04]"
          >
            Discover how
          </a>
        </div>

        {/* Floating visual */}
        <div className="hero-visual relative mt-20 w-full max-w-2xl">
          <div className="absolute inset-0 rounded-full bg-[#A45DCE]/15 blur-[100px]" />

          <div className="glass float-card relative mx-auto max-w-lg rounded-3xl p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-wide text-[#C7B6CE]">
                THE SELLING EXPERIENCE
              </span>

              <span className="rounded-full bg-[#C99FE5]/10 px-3 py-1 text-[10px] text-[#DABBEA]">
                SIMPLE BY DESIGN
              </span>
            </div>

            <div className="mt-8 grid grid-cols-3 items-center gap-3">
              {[
                { label: "Capture", symbol: "◉", color: "#F1B8DA" },
                { label: "Identify", symbol: "⌕", color: "#D1B0EE" },
                { label: "Pay", symbol: "▦", color: "#B9ACF8" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center"
                >
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl sm:h-20 sm:w-20"
                    style={{
                      background: `${item.color}18`,
                      border: `1px solid ${item.color}40`,
                      color: item.color,
                    }}
                  >
                    {item.symbol}
                  </div>

                  <p className="mt-3 text-xs text-[#E8D8EB]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 h-px bg-white/10" />

            <p className="mt-5 text-xs text-[#AFA0B7]">
              One picture. A smarter way to checkout.
            </p>
          </div>
        </div>

        <div className="absolute bottom-4 text-[10px] tracking-[0.25em] text-[#77677E]">
          SCROLL TO EXPLORE
        </div>
      </section>

      {/* Workflow */}
      <section
        id="how-it-works"
        className="relative z-10 border-t border-white/[0.07] px-6 py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div className="reveal max-w-xl">
            <p className="text-[10px] font-medium tracking-[0.25em] text-[#D6A5E5]">
              THE PROCESS
            </p>

            <h2 className="mt-5 text-4xl font-medium tracking-tight sm:text-5xl">
              Less manual work.
              <br />
              <span className="gradient-text italic">
                More selling.
              </span>
            </h2>
          </div>

          <div className="workflow-grid mt-16 grid gap-10 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="step-item border-t border-white/15 pt-6"
              >
                <p className="text-xs tracking-widest text-[#C99FE5]">
                  {step.number}
                </p>

                <h3 className="mt-8 text-2xl font-medium">
                  {step.title}
                </h3>

                <p className="mt-3 max-w-xs text-sm leading-7 text-[#AFA0B7]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 border-t border-white/[0.07] px-6 py-28"
      >
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
          <div className="reveal">
            <p className="text-[10px] tracking-[0.25em] text-[#D6A5E5]">
              MADE TO BE SIMPLE
            </p>

            <h2 className="mt-5 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Technology that gets out of your way.
            </h2>

            <p className="mt-6 max-w-md text-sm leading-8 text-[#AFA0B7]">
              Snap to Pay brings visual product recognition, catalogue
              management and digital payments into one streamlined workflow.
              No complicated checkout process. Just a better way to sell.
            </p>

            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-3 text-sm font-medium text-[#E8B9E7] transition hover:text-white"
            >
              Get started <span>↗</span>
            </Link>
          </div>

          <div className="feature-panel glass rounded-3xl p-8 sm:p-10">
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-[#F4D7F0]">
                  Visual recognition
                </p>

                <p className="mt-2 text-sm leading-7 text-[#AFA0B7]">
                  Identify products from images with AI assistance.
                </p>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <p className="text-sm font-medium text-[#E2C9F3]">
                  Effortless checkout
                </p>

                <p className="mt-2 text-sm leading-7 text-[#AFA0B7]">
                  Review your cart and generate a payment QR code.
                </p>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <p className="text-sm font-medium text-[#C9BDF8]">
                  Digital receipts
                </p>

                <p className="mt-2 text-sm leading-7 text-[#AFA0B7]">
                  Keep track of completed transactions and payment details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-28 text-center">
        <div className="final-cta">
          <p className="text-[10px] tracking-[0.25em] text-[#D6A5E5]">
            READY WHEN YOU ARE
          </p>

          <h2 className="mx-auto mt-6 max-w-2xl text-4xl font-medium tracking-tight sm:text-6xl">
            A better way to
            <br />
            <span className="gradient-text italic">
              make a sale.
            </span>
          </h2>

          <Link
            href="/register"
            className="mt-10 inline-block rounded-full bg-[#E9B4D9] px-8 py-3.5 text-sm font-semibold text-[#27172A] transition duration-300 hover:-translate-y-1 hover:bg-[#F4C9E6]"
          >
            Get started ↗
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.07] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            snap<span className="gradient-text">.</span>to
            <span className="text-[#DCA8DF]">.</span>pay
          </Link>

          <p className="text-xs text-[#827489]">
            @ 2026 Snap to Pay.
          </p>

          <div className="flex gap-6 text-xs text-[#B9A9BE]">
            <Link href="/login" className="transition hover:text-white">
              Sign in
            </Link>

            <Link href="/register" className="transition hover:text-white">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
