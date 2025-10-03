import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  devicetoken: string;
  email: string;
  emailVerified?: boolean;
  isActive: boolean;
  isLoggedIn: boolean;
  isMember: boolean;
  parrain: string;
  parrainGen: number;
  parrainRef: string;
  parrainUid: string;
  photoUrl: string;
  username: string;
  code?: string; // For OTP
  createdAt: any;
}

export interface Coupon {
  id: string;
  userId: string;
  amount: number;
  createdAt: any;
  expiresAt?: any | null;
  status: "active" | "used" | "expired" | "pending";
}

export interface AppTransaction {
  id: string;
  date: string;
  opRef: string;
  label: string;
  category: string;
  group: "tapaarpay_topup" | "airtime" | "products" | "bonus";
  type: "in" | "out";
  senderID: string;
  sender: string;
  senderPhone: string;
  amount: number;
  displayAmount: number;
  fees: number;
  receiverID: string;
  receiver: string;
  receiverPhone: string;
  method: string;
  methodRef: string;
  createdAt: any;
  status: "confirmed" | "pending" | "cancelled";
  product?: string;
  productPrice?: number;
}

export interface Wallet {
  balance: number;
  type: string;
  updatedAt: any;
}

export interface Task {
  id: string;
  type: "internal" | "external";
  title: string;
  description: string;
  reward: number;
  status: "available" | "expired";
  createdAt: any;
}

export interface UserTask {
  id: string;
  status: "completed" | "inProgress";
  rewardGiven: boolean;
  completedAt: any;
}

export interface MembershipProfile {
  affiliates: number;
  directAffiliates: number;
  createdAt: Timestamp | any;
  generation: number;
  parrain: string;
  parrainRef: string;
  parrainUid: string;
  parrainGen: number;
  grandParrain: string;
  grandParrainRef: string;
  grandParrainUid: string;
  greatParrain: string;
  greatParrainRef: string;
  greatParrainUid: string;
  photoUrl: string;
  level: number;
  pack: string;
  star: number;
  packName: string;
  referral: string;
  uid: string;
  username: string;
  updatedAt: Timestamp | any;
}

export interface MembershipPack {
  id: string;
  title: string;
  price: number;
  options: string[];
  disable?: boolean;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatarUrl: string;
  points: number;
}

// Marketplace Types

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imgUrl: {
    name: string;
    url: string;
  }[];
}

export enum ProductCondition {
  Neuf = "Neuf",
  Reconditionne = "Reconditionné",
  Occasion = "Occasion",
}

export interface ISeller {
  id: string;
  name: string;
  rating?: number; // average seller rating (optional)
  returnPolicy?: string; // description of return policy (optional)
}

export interface Product {
  id?: string;
  sku?: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  imgUrl: {
    name: string;
    fileName: string;
    fileSize: number;
    size: number;
    fileKey: string;
    key: string;
    fileUrl: string;
    url: string;
  }[];
  categorySlugs: Array<string>;
  categories: ProductCategory[];
  price: number;
  promo: number;
  stock: number;
  sales: number;
  taxes: number;
  quantity: number;
  delivery: number;
  installments: Array<number>;
  status: string;
  createdAt: any;
  featured: boolean;
  bestSeller: boolean;
  freeShipping?: boolean;
  tendence?: boolean;
  promox?: boolean;
  garantie?: number;
  condition: "Neuf" | "Occasion" | "Reconditionné";
  seller?: ISeller;
  variationType: "car" | "phone" | "laptop" | "new";
  variations?: any[];
}

export interface Job {
  id: string;
  amount: string;
  createdAt: any;
  operator: string;
  phoneNumber: string;
  status: "pending" | "completed" | "failed";
  transactionId: string;
  type: "airtime" | "other";
  ussdSequence: string[];
  pin: string;
}

export interface SMS {
  id: string;
  message: string;
  createdAt: any;
  from: string;
  operator: "MTN" | "MOOV" | "CELTIIS";
  parsedAmount: number;
  parsedDate: any;
  parsedPhone: string;
  parsedPhoneNormalized: string;
  parsedRef: string;
  processed: boolean;
}
