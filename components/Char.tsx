import Image from './atoms/Image';

const Char = ({ d }:any) => {
  console.log('i', d);
  return (
    <div>
      <img src={d}  alt=''/>
    </div>
  );
};

export default Char;
