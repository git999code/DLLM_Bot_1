import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import type { PositionInfo, LbPosition, PositionData } from '@meteora-ag/dlmm';

export interface DetailedPosition {
  poolAddress: string;
  tokenXMint: string;
  tokenYMint: string;
  positionPubkey: string;
  lowerBinId: number;
  upperBinId: number;
  totalXAmount: string;
  totalYAmount: string;
  feeX: string;
  feeY: string;
  rewardOne: string;
  rewardTwo: string;
  lastUpdatedAt: string;
  binData: Array<{
    binId: number;
    price: string;
    pricePerToken: string;
    binXAmount: string;
    binYAmount: string;
    binLiquidity: string;
    positionLiquidity: string;
    positionXAmount: string;
    positionYAmount: string;
    positionFeeXAmount: string;
    positionFeeYAmount: string;
    positionRewardAmount: string[];
  }>;
}

export async function checkActiveDLMMPositions(
  connection: Connection,
  walletAddress: string
): Promise<DetailedPosition[]> {
  try {
    const walletPubkey = new PublicKey(walletAddress);

    const positionsMap = await DLMM.getAllLbPairPositionsByUser(connection, walletPubkey);
    // Log the raw response, handling BigInt serialization
    console.log('Raw DLMM positions response:', JSON.stringify([...positionsMap], (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    
    if (!positionsMap || positionsMap.size === 0) {
      return [];
    }

    const detailedPositions: DetailedPosition[] = [];
    for (const [poolAddress, positionInfo] of positionsMap.entries()) {
      if (positionInfo.lbPairPositionsData && positionInfo.lbPairPositionsData.length > 0) {
        for (const pos of positionInfo.lbPairPositionsData as LbPosition[]) {
          const pd: PositionData = pos.positionData;
          detailedPositions.push({
            poolAddress,
            tokenXMint: positionInfo.tokenX.mint?.toString() ?? '',
            tokenYMint: positionInfo.tokenY.mint?.toString() ?? '',
            positionPubkey: pos.publicKey ? pos.publicKey.toBase58() : '',
            lowerBinId: pd.lowerBinId ?? 0,
            upperBinId: pd.upperBinId ?? 0,
            totalXAmount: pd.totalXAmount ? (parseFloat(pd.totalXAmount.toString()) / 1e9).toString() : '0',
            totalYAmount: pd.totalYAmount ? (parseFloat(pd.totalYAmount.toString()) / 1e6).toString() : '0',
            feeX: pd.feeX ? (parseFloat(pd.feeX.toString()) / 1e9).toString() : '0',
            feeY: pd.feeY ? (parseFloat(pd.feeY.toString()) / 1e6).toString() : '0',
            rewardOne: pd.rewardOne ? (parseFloat(pd.rewardOne.toString()) / 1e9).toString() : '0',
            rewardTwo: pd.rewardTwo ? (parseFloat(pd.rewardTwo.toString()) / 1e9).toString() : '0',
            lastUpdatedAt: pd.lastUpdatedAt?.toString?.() ?? '',
            binData: pd.positionBinData?.map(bin => ({
              binId: bin.binId ?? 0,
              price: bin.price?.toString?.() ?? '0',
              pricePerToken: bin.pricePerToken?.toString?.() ?? '0',
              binXAmount: bin.binXAmount ? (parseFloat(bin.binXAmount.toString()) / 1e9).toString() : '0',
              binYAmount: bin.binYAmount ? (parseFloat(bin.binYAmount.toString()) / 1e6).toString() : '0',
              binLiquidity: bin.binLiquidity?.toString?.() ?? '0',
              positionLiquidity: bin.positionLiquidity?.toString?.() ?? '0',
              positionXAmount: bin.positionXAmount ? (parseFloat(bin.positionXAmount.toString()) / 1e9).toString() : '0',
              positionYAmount: bin.positionYAmount ? (parseFloat(bin.positionYAmount.toString()) / 1e6).toString() : '0',
              positionFeeXAmount: bin.positionFeeXAmount ? (parseFloat(bin.positionFeeXAmount.toString()) / 1e9).toString() : '0',
              positionFeeYAmount: bin.positionFeeYAmount ? (parseFloat(bin.positionFeeYAmount.toString()) / 1e6).toString() : '0',
              positionRewardAmount: Array.isArray(bin.positionRewardAmount)
                ? bin.positionRewardAmount.map(r => r?.toString?.() ?? '0')
                : [],
            })) ?? [],
          });
        }
      }
    }
    return detailedPositions;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('network')) {
      console.error('Network error while fetching DLMM positions:', error.message);
    } else if (error instanceof Error && error.message.includes('wallet')) {
      console.error('Invalid wallet error while fetching DLMM positions:', error.message);
    } else {
      console.error('Failed to fetch DLMM positions:', error instanceof Error ? error.message : error.toString());
    }
    return [];
  }
}

export function formatPositionsForOutput(positions: DetailedPosition[], outputFormat: 'cli' | 'gui'): any[] {
  if (outputFormat === 'gui') {
    return positions;
  }
  return positions.map(pos => ({
    poolAddress: pos.poolAddress,
    tokenXMint: pos.tokenXMint,
    tokenYMint: pos.tokenYMint,
    positionPubkey: pos.positionPubkey,
    lowerBinId: pos.lowerBinId,
    upperBinId: pos.upperBinId,
    totalXAmount: pos.totalXAmount,
    totalYAmount: pos.totalYAmount,
    feeX: pos.feeX,
    feeY: pos.feeY,
    rewardOne: pos.rewardOne,
    rewardTwo: pos.rewardTwo,
    lastUpdatedAt: pos.lastUpdatedAt,
    binDataCount: pos.binData.length,
  }));
}