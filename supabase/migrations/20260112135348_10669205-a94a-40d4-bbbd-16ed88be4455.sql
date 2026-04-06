-- Allow admins and founders to manage loyalty_rewards
CREATE POLICY "Admins can insert rewards" 
ON public.loyalty_rewards 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));

CREATE POLICY "Admins can update rewards" 
ON public.loyalty_rewards 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));

CREATE POLICY "Admins can delete rewards" 
ON public.loyalty_rewards 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));

-- Allow admins to view all rewards (including inactive ones)
CREATE POLICY "Admins can view all rewards" 
ON public.loyalty_rewards 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));