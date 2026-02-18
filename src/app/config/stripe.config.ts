import { envVars } from "./env";
import Stripe from "stripe";

export const stripe = new Stripe(envVars.STRIPE.STRIPE_SECRET_KEY);
