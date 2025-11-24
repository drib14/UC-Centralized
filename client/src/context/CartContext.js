import React, { createContext, useState, useEffect, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    useEffect(() => {
        const storedCart = localStorage.getItem('ucc_cart');
        if (storedCart) {
            setCart(JSON.parse(storedCart));
        }
    }, []);

    const saveCart = (newCart) => {
        setCart(newCart);
        localStorage.setItem('ucc_cart', JSON.stringify(newCart));
    };

    // Helper to generate a unique ID for cart items (Product ID + Variant)
    const getCartId = (item, variant) => {
        if (!variant) return item._id;
        return `${item._id}-${variant.size}-${variant.color}`;
    };

    const addItem = (product, variant = null) => {
        const cartId = getCartId(product, variant);
        const existing = cart.find(i => i.cartId === cartId);

        let newCart;
        if (existing) {
            // Check stock limit before adding
            const limit = variant ? variant.stock : product.stock;
            if (existing.quantity + 1 > limit) {
                // Return false or throw error if we want to notify UI, for now just don't add
                return false;
            }
            newCart = cart.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
            newCart = [...cart, {
                ...product,
                cartId,
                variant,
                quantity: 1
            }];
        }
        saveCart(newCart);
        return true;
    };

    const removeItem = (cartId) => {
        const newCart = cart.filter(i => i.cartId !== cartId);
        saveCart(newCart);
    };

    const updateQuantity = (cartId, quantity) => {
        let newCart;
        if (quantity <= 0) {
            newCart = cart.filter(i => i.cartId !== cartId);
        } else {
            newCart = cart.map(i => {
                if (i.cartId === cartId) {
                    // Stock validation
                    const limit = i.variant ? i.variant.stock : i.stock;
                    if (quantity > limit) return i; // Do nothing if exceeds stock
                    return { ...i, quantity: parseInt(quantity) };
                }
                return i;
            });
        }
        saveCart(newCart);
    };

    const clearCart = () => {
        saveCart([]);
    };

    const getCount = () => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    };

    const getTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const value = {
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getCount,
        getTotal
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
