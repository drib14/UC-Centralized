import React from 'react';

const StickerPicker = ({ onSelect }) => {
    // Using a set of public domain or reliable placeholder sticker images
    const stickers = [
        'https://cdn-icons-png.flaticon.com/512/742/742751.png', // Smile
        'https://cdn-icons-png.flaticon.com/512/742/742752.png', // Laugh
        'https://cdn-icons-png.flaticon.com/512/742/742920.png', // Love
        'https://cdn-icons-png.flaticon.com/512/742/742760.png', // Wink
        'https://cdn-icons-png.flaticon.com/512/742/742823.png', // Cool
        'https://cdn-icons-png.flaticon.com/512/742/742750.png', // Sad
        'https://cdn-icons-png.flaticon.com/512/742/742772.png', // Angry
        'https://cdn-icons-png.flaticon.com/512/742/742921.png', // Like
        'https://cdn-icons-png.flaticon.com/512/1214/1214428.png', // Cat
        'https://cdn-icons-png.flaticon.com/512/4392/4392452.png', // Dog
        'https://cdn-icons-png.flaticon.com/512/4392/4392523.png', // Bear
        'https://cdn-icons-png.flaticon.com/512/166/166538.png'  // Robot
    ];

    return (
        <div className="bg-white rounded-3 shadow p-2" style={{width: 300, maxHeight: 300, overflowY: 'auto'}}>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
                {stickers.map((s, i) => (
                    <img
                        key={i}
                        src={s}
                        alt="Sticker"
                        className="cursor-pointer hover-scale"
                        style={{width: 60, height: 60, objectFit: 'contain'}}
                        onClick={() => onSelect(s)}
                    />
                ))}
            </div>
        </div>
    );
};

export default StickerPicker;
