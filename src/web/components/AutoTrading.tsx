import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    Card,
    CardContent,
} from '@mui/material';
import { PlayArrow, Stop, Settings, TrendingUp, AttachMoney, Timeline } from '@mui/icons-material';
import { useWeb3 } from '../providers/Web3Provider';
import { tradingBotService, TradingStats } from '../../services/tradingBotService';

const AutoTrading: React.FC = () => {
    const { account } = useWeb3();
    const [selectedStrategy, setSelectedStrategy] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [investmentAmount, setInvestmentAmount] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [takeProfit, setTakeProfit] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [stats, setStats] = useState<TradingStats>({
        totalProfit: 0,
        totalTrades: 0,
        winRate: 0,
        activeTime: 0,
        lastPrice: 0,
        currentPosition: null,
        lastTradeTime: null
    });

    useEffect(() => {
        if (account) {
            // Check if bot is already running
            const isActive = tradingBotService.isRunning(account);
            setIsRunning(isActive);

            if (isActive) {
                // Load existing config
                const config = tradingBotService.getConfig(account);
                if (config) {
                    setSelectedStrategy(config.strategy);
                    setInvestmentAmount(config.investmentAmount.toString());
                    setStopLoss(config.stopLoss?.toString() || '');
                    setTakeProfit(config.takeProfit?.toString() || '');
                }
            }
        }
    }, [account]);

    useEffect(() => {
        if (account && isRunning) {
            const interval = setInterval(() => {
                const currentStats = tradingBotService.getStats(account);
                if (currentStats) {
                    setStats(currentStats);
                }
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [account, isRunning]);

    const handleStartTrading = async () => {
        if (!account) {
            setError('Please connect your wallet first');
            return;
        }

        if (!selectedStrategy) {
            setError('Please select a trading strategy');
            return;
        }

        const strategy = tradingBotService.getStrategy(selectedStrategy);
        if (!strategy) {
            setError('Invalid strategy selected');
            return;
        }

        const amount = parseFloat(investmentAmount);
        if (!amount || amount < strategy.minInvestment || amount > strategy.maxInvestment) {
            setError(`Investment amount must be between $${strategy.minInvestment} and $${strategy.maxInvestment}`);
            return;
        }

        setError(null);
        setLoading(true);

        try {
            await tradingBotService.startBot({
                strategy: selectedStrategy,
                investmentAmount: amount,
                stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
                takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
                walletAddress: account
            });
            setIsRunning(true);
        } catch (err) {
            setError('Failed to start trading bot. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStopTrading = async () => {
        if (!account) return;
        
        setLoading(true);
        try {
            await tradingBotService.stopBot(account);
            setIsRunning(false);
        } catch (err) {
            setError('Failed to stop trading bot. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    const handleStrategyChange = (strategyId: string) => {
        setSelectedStrategy(strategyId);
        const strategy = tradingBotService.getStrategy(strategyId);
        if (strategy) {
            setStopLoss(strategy.defaultStopLoss.toString());
            setTakeProfit(strategy.defaultTakeProfit.toString());
        }
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Auto Trading
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Trading Strategy</InputLabel>
                                    <Select
                                        value={selectedStrategy}
                                        onChange={(e) => handleStrategyChange(e.target.value)}
                                        label="Trading Strategy"
                                    >
                                        {tradingBotService.strategies.map((strategy) => (
                                            <MenuItem key={strategy.id} value={strategy.id}>
                                                {strategy.name} - {strategy.risk} Risk
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {selectedStrategy && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" color="primary" gutterBottom>
                                            Strategy Details
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {tradingBotService.getStrategy(selectedStrategy)?.description}
                                        </Typography>
                                        <Box sx={{ mt: 1, display: 'flex', gap: 3 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Expected Return: {tradingBotService.getStrategy(selectedStrategy)?.expectedReturn}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Timeframe: {tradingBotService.getStrategy(selectedStrategy)?.timeframe}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Investment Amount (USD)"
                                    type="number"
                                    value={investmentAmount}
                                    onChange={(e) => setInvestmentAmount(e.target.value)}
                                    InputProps={{ 
                                        inputProps: { 
                                            min: selectedStrategy ? 
                                                tradingBotService.getStrategy(selectedStrategy)?.minInvestment : 0,
                                            max: selectedStrategy ?
                                                tradingBotService.getStrategy(selectedStrategy)?.maxInvestment : undefined
                                        } 
                                    }}
                                    helperText={selectedStrategy ? 
                                        `Min: $${tradingBotService.getStrategy(selectedStrategy)?.minInvestment} - Max: $${tradingBotService.getStrategy(selectedStrategy)?.maxInvestment}` : 
                                        undefined
                                    }
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={showAdvanced}
                                            onChange={(e) => setShowAdvanced(e.target.checked)}
                                        />
                                    }
                                    label="Show Advanced Settings"
                                />
                            </Grid>

                            {showAdvanced && (
                                <>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Stop Loss (%)"
                                            type="number"
                                            value={stopLoss}
                                            onChange={(e) => setStopLoss(e.target.value)}
                                            InputProps={{ inputProps: { min: 0, max: 100 } }}
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Take Profit (%)"
                                            type="number"
                                            value={takeProfit}
                                            onChange={(e) => setTakeProfit(e.target.value)}
                                            InputProps={{ inputProps: { min: 0, max: 1000 } }}
                                        />
                                    </Grid>
                                </>
                            )}

                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button
                                        variant="contained"
                                        color={isRunning ? 'error' : 'primary'}
                                        onClick={isRunning ? handleStopTrading : handleStartTrading}
                                        startIcon={isRunning ? <Stop /> : <PlayArrow />}
                                        disabled={loading || !account}
                                        size="large"
                                    >
                                        {loading ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : isRunning ? (
                                            'Stop Trading'
                                        ) : (
                                            'Start Trading'
                                        )}
                                    </Button>

                                    <Button
                                        variant="outlined"
                                        startIcon={<Settings />}
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                    >
                                        Settings
                                    </Button>
                                </Box>
                            </Grid>

                            {error && (
                                <Grid item xs={12}>
                                    <Alert severity="error">{error}</Alert>
                                </Grid>
                            )}

                            {!account && (
                                <Grid item xs={12}>
                                    <Alert severity="warning">
                                        Please connect your wallet to start trading
                                    </Alert>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Trading Statistics
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <AttachMoney color="primary" />
                                            <Typography variant="subtitle1" sx={{ ml: 1 }}>
                                                Total Profit/Loss
                                            </Typography>
                                        </Box>
                                        <Typography variant="h4" color={stats.totalProfit >= 0 ? 'success.main' : 'error.main'}>
                                            ${stats.totalProfit.toFixed(2)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <TrendingUp color="primary" />
                                            <Typography variant="subtitle1" sx={{ ml: 1 }}>
                                                Performance
                                            </Typography>
                                        </Box>
                                        <Grid container spacing={1}>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Total Trades
                                                </Typography>
                                                <Typography variant="h6">
                                                    {stats.totalTrades}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Win Rate
                                                </Typography>
                                                <Typography variant="h6">
                                                    {(stats.winRate * 100).toFixed(1)}%
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <Timeline color="primary" />
                                            <Typography variant="subtitle1" sx={{ ml: 1 }}>
                                                Active Time
                                            </Typography>
                                        </Box>
                                        <Typography variant="h6">
                                            {formatDuration(stats.activeTime)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {stats.currentPosition && (
                                <Grid item xs={12}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Current Position
                                            </Typography>
                                            <Typography variant="h6" color={stats.currentPosition === 'long' ? 'success.main' : 'error.main'}>
                                                {stats.currentPosition.toUpperCase()}
                                            </Typography>
                                            {stats.lastTradeTime && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Last trade: {new Date(stats.lastTradeTime).toLocaleTimeString()}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AutoTrading;
