import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, type = 'website' }) => {
    return (
        <Helmet>
            <title>{title} | UC-Central</title>
            <meta name="description" content={description} />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={`${title} | UC-Central`} />
            <meta property="og:description" content={description} />
        </Helmet>
    );
};

export default SEO;
