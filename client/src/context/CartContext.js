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

    const getId = (item) => item._id || item.id;

    const addItem = (product) => {
        const pId = getId(product);
        const existing = cart.find(i => getId(i) === pId);
        let newCart;
        if (existing) {
            newCart = cart.map(i => getId(i) === pId ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
            newCart = [...cart, { ...product, quantity: 1 }];
        }
        saveCart(newCart);
    };

    const removeItem = (productId) => {
        const newCart = cart.filter(i => getId(i) !== productId);
        saveCart(newCart);
    };

    const updateQuantity = (productId, quantity) => {
        let newCart;
        if (quantity <= 0) {
            newCart = cart.filter(i => getId(i) !== productId);
        } else {
            newCart = cart.map(i => getId(i) === productId ? { ...i, quantity: parseInt(quantity) } : i);
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
