import { createContext, useContext } from "react"

export const CartContext = createContext()

// ✅ Export only the hook from this file
export const useCart = () => useContext(CartContext)