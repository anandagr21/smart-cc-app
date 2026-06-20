import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, BellRing, BookOpen, Bot, BrainCircuit, Calendar, Car, Check, CheckCircle, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coffee, Compass, Cpu, CreditCard, Database, Edit2, FileText, Film, Filter, Fingerprint, Focus, FolderKanban, Fuel, Gift, GitCommit, HelpCircle, History, Home, IndianRupee, Info, Layers, LayoutList, Lightbulb, Link, ListChecks, Lock, LogOut, Mail, MapPin, Maximize, MessageSquare, MessageSquareWarning, Monitor, Moon, Network, Pencil, Plane, PlayCircle, Plus, Receipt, RefreshCw, Rocket, Scale, Search, Settings, Shield, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone, Sparkles, Store, Sun, Tag, Target, Trash2, TrendingUp, Trophy, UploadCloud, User, Utensils, Wifi, X, Zap,
  Circle, LucideIcon,
} from 'lucide-react-native';

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}>;

const ICON_REGISTRY: Record<string, IconComponent> = {
  Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, BellRing, BookOpen, Bot, BrainCircuit, Calendar, Car, Check, CheckCircle, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coffee, Compass, Cpu, CreditCard, Database, Edit2, FileText, Film, Filter, Fingerprint, Focus, FolderKanban, Fuel, Gift, GitCommit, HelpCircle, History, Home, IndianRupee, Info, Layers, LayoutList, Lightbulb, Link, ListChecks, Lock, LogOut, Mail, MapPin, Maximize, MessageSquare, MessageSquareWarning, Monitor, Moon, Network, Pencil, Plane, PlayCircle, Plus, Receipt, RefreshCw, Rocket, Scale, Search, Settings, Shield, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone, Sparkles, Store, Sun, Tag, Target, Trash2, TrendingUp, Trophy, UploadCloud, User, Utensils, Wifi, X, Zap,
};

interface DynamicIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, size = 24, color, strokeWidth = 2, style }) => {
  const IconComponent: IconComponent = ICON_REGISTRY[name] || Circle;
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} style={style} />;
};
