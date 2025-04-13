import { ShoppingCart } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'

function Navbar() {
  const cartContext = useCart()

  console.log('Cart Context:', cartContext) // Debug log

  const {
    calculateTotalCart, 
    toggleCart, 
    cartVisible,
    getAllCartItems,
    restaurantCarts
  } = cartContext || {}

  const navigate = useNavigate()

  const handleCheckout = () => {
    navigate("/checkout")
  }

  // Safely get cart items and totals
  const allCartItems = getAllCartItems ? getAllCartItems() : []
  const { totalItems = 0, totalPrice = 0 } = calculateTotalCart ? calculateTotalCart() : {}

  console.log('All Cart Items:', allCartItems) // Debug log
  console.log('Restaurant Carts:', restaurantCarts) // Debug log

  // Group items by restaurant
  const cartItemsByRestaurant = allCartItems.reduce((acc, item) => {
    if (!acc[item.restaurantId]) {
      acc[item.restaurantId] = {
        name: item.restaurantName || 'Unknown Restaurant',
        image: item.restaurantImage || '',
        items: []
      }
    }
    acc[item.restaurantId].items.push(item)
    return acc
  }, {})

  return (
    <div>
      <nav className="p-0 m-0 bg-amber-400 size-auto fixed top-0 left-0 right-0">
        <div className="ml-11 mr-11">
          <div className="flex justify-between items-center">
            <a href="/" className="m-0 p-0 font-extrabold text-2xl">logo</a>
            <div className='grid grid-cols-3 space-x-25 relative top-2'>
              <div className="relative group">
                <ShoppingCart 
                  className='size-8 mr-16 cursor-pointer' 
                  onClick={toggleCart} 
                />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className='relative font-bold size-12'>
                <SignedOut>
                  <SignInButton mode="modal" redirectUrl="/" signUpUrl="/sign-up" signInUrl="/sign-in" className="text-[14px] text-black font-black text-2xl"/>
                </SignedOut>
                <SignedIn className="text-[14px] text-black font-black text-2xl">
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </div>
        </div>
      </nav>
      {cartVisible && (
        <div className="fixed right-16 top-16 bg-white rounded-lg shadow-xl p-4 w-96 z-50">
          <h3 className="font-bold text-lg mb-4">Your Cart</h3>
          {totalItems > 0 ? (
            <>
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(cartItemsByRestaurant).map(([restaurantId, restaurantData]) => (
                  <div key={restaurantId} className="mb-4">
                    <div className="flex items-center mb-2">
                      {restaurantData.image && (
                        <img 
                          src={restaurantData.image} 
                          alt={restaurantData.name} 
                          className="w-8 h-8 rounded-full mr-2 object-cover"
                        />
                      )}
                      <h4 className="font-semibold text-sm">
                        {restaurantData.name}
                      </h4>
                    </div>
                    {restaurantData.items.map(item => (
                      <div key={item.id} className="flex items-center mb-3 pb-3 border-b">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden mr-3">
                          <img 
                            src={item.image_url || "/placeholder.svg"}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500">
                              ${item.price.toFixed(2)} × {item.quantity}
                            </p>
                            <p className="font-bold text-sm">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between mb-2">
                  <span>Total:</span>
                  <span className="font-bold">${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-amber-400 text-gray-800 font-bold py-2 rounded-lg">
                  Checkout
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-4">Your cart is empty</p>
          )}
        </div>
      )}
    </div>
  )
}

export default Navbar