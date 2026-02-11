import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts
import { WalletProvider } from './contexts/WalletContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Layout
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';

// Pages (lazy loaded for performance)
import Home from './pages/Home';
import InstaPay from './pages/InstaPay';
import SmartSplit from './pages/SmartSplit';
import FairTicket from './pages/FairTicket';
import ClearFund from './pages/ClearFund';
import Dashboard from './pages/Dashboard';

export default function App() {
    return (
        <LanguageProvider>
            <WalletProvider>
                <BrowserRouter>
                    <div className="app-layout">
                        <Header />

                        <div className="app-body">
                            <Sidebar />

                            <main className="app-main">
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/instapay" element={<InstaPay />} />
                                    <Route path="/smartsplit" element={<SmartSplit />} />
                                    <Route path="/fairticket" element={<FairTicket />} />
                                    <Route path="/clearfund" element={<ClearFund />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                </Routes>
                            </main>
                        </div>

                        <Footer />

                        {/* Toast Notifications */}
                        <Toaster
                            position="bottom-right"
                            richColors
                            theme="light"
                            closeButton
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        />
                    </div>
                </BrowserRouter>
            </WalletProvider>
        </LanguageProvider>
    );
}
