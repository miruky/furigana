import { describe, expect, it } from 'vitest';
import { alignReading } from './align';

describe('alignReading', () => {
  it('送り仮名を挟む複合動詞を漢字ごとに割り当てる', () => {
    expect(alignReading('読み込む', 'よみこむ')).toEqual([
      { text: '読', ruby: 'よ' },
      { text: 'み' },
      { text: '込', ruby: 'こ' },
      { text: 'む' },
    ]);
  });

  it('漢字だけのトークンは全体にひとつのルビ', () => {
    expect(alignReading('東京都', 'とうきょうと')).toEqual([
      { text: '東京都', ruby: 'とうきょうと' },
    ]);
  });

  it('前後にかなを持つ語も照合できる', () => {
    expect(alignReading('お疲れ様', 'おつかれさま')).toEqual([
      { text: 'お' },
      { text: '疲', ruby: 'つか' },
      { text: 'れ' },
      { text: '様', ruby: 'さま' },
    ]);
  });

  it('同じかなが繰り返されても正しく区切る', () => {
    expect(alignReading('聞き取り', 'ききとり')).toEqual([
      { text: '聞', ruby: 'き' },
      { text: 'き' },
      { text: '取', ruby: 'と' },
      { text: 'り' },
    ]);
  });

  it('表層のカタカナは読みと突き合わせて区別する', () => {
    expect(alignReading('缶ビール', 'かんびーる')).toEqual([
      { text: '缶', ruby: 'かん' },
      { text: 'ビール' },
    ]);
  });

  it('繰り返し記号も漢字の連に含める', () => {
    expect(alignReading('人々', 'ひとびと')).toEqual([{ text: '人々', ruby: 'ひとびと' }]);
  });

  it('漢字がなければルビを振らない', () => {
    expect(alignReading('そして', 'そして')).toEqual([{ text: 'そして' }]);
  });

  it('読みと表層が照合できないときはトークン全体にルビを振る', () => {
    expect(alignReading('あ漢', 'いかん')).toEqual([{ text: 'あ漢', ruby: 'いかん' }]);
  });
});
