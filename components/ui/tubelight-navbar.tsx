"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(items[0].name)
  const [isMobile, setIsMobile] = useState(false)

  // Sync active tab with current pathname
  useEffect(() => {
    const currentItem = items.find(item => item.url === pathname)
    if (currentItem) {
      setActiveTab(currentItem.name)
    }
  }, [pathname, items])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className={cn(
        "relative z-50",
        className,
      )}
    >
      <div className="flex items-center gap-3 bg-black/50 border border-white/20 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item.name);
                router.push(item.url);
              }}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                "text-zinc-300 hover:text-white",
                isActive && "bg-white/10 text-white",
              )}
              prefetch={true}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              <motion.div
                layoutId="lamp"
                className={cn(
                  "absolute inset-0 w-full rounded-full -z-10",
                  isActive ? "bg-white/20" : "bg-transparent"
                )}
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 40,
                  mass: 0.5,
                }}
                style={{ 
                  willChange: isActive ? 'transform, opacity' : 'transform',
                  opacity: isActive ? 1 : 0,
                }}
              >
                <div 
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-t-full"
                  style={{ 
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 0.15s ease-out',
                  }}
                >
                  <div className="absolute w-12 h-6 bg-white/30 rounded-full blur-md -top-2 -left-2" />
                  <div className="absolute w-8 h-6 bg-white/30 rounded-full blur-md -top-1" />
                  <div className="absolute w-4 h-4 bg-white/30 rounded-full blur-sm top-0 left-2" />
                </div>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
