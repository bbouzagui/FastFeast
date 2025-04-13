"use client"

import { useCallback, useState, createContext, useContext, useEffect } from "react"
import PropTypes from "prop-types" // ✅ Import PropTypes

export const CartContext = createContext()

export const useCart = () => useContext(CartContext)

export function CartProvider({ children }) {
  const [cartVisible, setCartVisible] = useState(false)
  const [restaurantCarts, setRestaurantCarts] = useState(() => {
    const storedCart = localStorage.getItem("restaurantCarts")
    return storedCart ? JSON.parse(storedCart) : {}
  })
  const [currentRestaurantId, setCurrentRestaurantId] = useState(null)
  const [setCart] = useState([])

  const removeFromCart = (itemId) => {
    setCart(prevCarts => prevCarts.filter(item => item.id !== itemId))
  }

  const toggleCart = () => {
    setCartVisible(!cartVisible)
  }

  const getCurrentCart = useCallback(() => {
    return restaurantCarts[currentRestaurantId] || { items: {}, menuCategories: null }
  }, [currentRestaurantId, restaurantCarts])

  const updateItemQuantity = useCallback((restaurantId, itemId, change) => {
    setRestaurantCarts((prevCarts) => {
      const restaurantCart = prevCarts[restaurantId] || {
        items: {},
        menuCategories: null,
        restaurantName: "",
        restaurantImage: "",
      }
      const currentQuantity = restaurantCart.items[itemId] || 0
      const newQuantity = Math.max(0, currentQuantity + change)

      const updatedCart = {
        ...restaurantCart,
        items: {
          ...restaurantCart.items,
        },
      }

      if (newQuantity > 0) {
        updatedCart.items[itemId] = newQuantity
      } else if (updatedCart.items[itemId]) {
        delete updatedCart.items[itemId]
      }

      const updatedCarts = {
        ...prevCarts,
        [restaurantId]: updatedCart,
      }

      localStorage.setItem("restaurantCarts", JSON.stringify(updatedCarts))
      return updatedCarts
    })
  }, [])

  const updateMenuCategories = useCallback((restaurantId, menuCategories, restaurantData) => {
    if (!restaurantId) {
      console.error("Restaurant ID is required to update menu categories")
      return
    }

    setCurrentRestaurantId(restaurantId)
    setRestaurantCarts((prevCarts) => {
      const restaurantCart = prevCarts[restaurantId] || {
        items: {},
        menuCategories: null,
        restaurantName: "",
        restaurantImage: "",
      }

      const updatedCarts = {
        ...prevCarts,
        [restaurantId]: {
          ...restaurantCart,
          menuCategories: menuCategories,
          restaurantName: restaurantData?.name || "",
          restaurantImage: restaurantData?.image_url || "",
        },
      }

      localStorage.setItem("restaurantCarts", JSON.stringify(updatedCarts))
      return updatedCarts
    })
  }, [])

  const calculateCart = useCallback((restaurantId) => {
    const restaurantCart = restaurantCarts[restaurantId] || { items: {}, menuCategories: null }
    const { items, menuCategories } = restaurantCart

    if (!items || !menuCategories) return { totalItems: 0, totalPrice: 0 }

    let totalItems = 0
    let totalPrice = 0

    Object.entries(menuCategories).forEach(([, categoryItems]) => {
      categoryItems.forEach((item) => {
        const quantity = items[item.id] || 0
        totalItems += quantity
        totalPrice += quantity * item.price
      })
    })

    return { totalItems, totalPrice }
  }, [restaurantCarts])

  const calculateTotalCart = useCallback(() => {
    let totalItems = 0
    let totalPrice = 0

    Object.keys(restaurantCarts).forEach((restaurantId) => {
      const { totalItems: items, totalPrice: price } = calculateCart(restaurantId)
      totalItems += items
      totalPrice += price
    })

    return { totalItems, totalPrice }
  }, [restaurantCarts, calculateCart])

  useEffect(() => {
    localStorage.setItem("restaurantCarts", JSON.stringify(restaurantCarts))
  }, [restaurantCarts])

  const getAllCarts = useCallback(() => {
    return Object.entries(restaurantCarts)
      .filter(([, cart]) => cart.items && Object.keys(cart.items).length > 0)
      .reduce((acc, [id, cart]) => {
        acc[id] = cart
        return acc
      }, {})
  }, [restaurantCarts])

  const getAllCartItems = useCallback(() => {
    const allItems = []

    Object.entries(restaurantCarts).forEach(([restaurantId, cart]) => {
      if (!cart.items || !cart.menuCategories) return

      const { items: itemQuantities, menuCategories, restaurantName, restaurantImage } = cart

      const allMenuItems = []
      Object.values(menuCategories).forEach((categoryItems) => {
        allMenuItems.push(...categoryItems)
      })

      Object.entries(itemQuantities).forEach(([itemId, quantity]) => {
        if (quantity > 0) {
          const menuItem = allMenuItems.find((item) => item.id === itemId)
          if (menuItem) {
            allItems.push({
              ...menuItem,
              quantity,
              restaurantId,
              restaurantName: restaurantName || "Restaurant",
              restaurantImage: restaurantImage || "",
            })
          }
        }
      })
    })

    return allItems
  }, [restaurantCarts])

  return (
    <CartContext.Provider
      value={{
        getCurrentCart,
        updateItemQuantity,
        calculateCart,
        calculateTotalCart,
        cartVisible,
        toggleCart,
        currentRestaurantId,
        updateMenuCategories,
        restaurantCarts,
        getAllCarts,
        getAllCartItems,
        removeFromCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

// ✅ Add this to fix the ESLint warning
CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
