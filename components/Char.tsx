import Image from './atoms/Image';

const Char = ({ d }) => {
  console.log('i', d);
  return (
    <div>
      <img src={d} />
    </div>
  );
};

export default Char;
