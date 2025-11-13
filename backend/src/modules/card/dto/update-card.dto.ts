export class UpdateCardDto {
  authenticatedAt?: Date;
  method?: string;
  billingKey?: string;
  cardCompany?: string;
  issuerCode?: string;
  acquirerCode?: string;
  number?: string;
  cardType?: string;
  ownerType?: string;
  isAuthenticated?: boolean;
  isDefault?: boolean;
}
