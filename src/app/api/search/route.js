export async function POST(request) {
  const { fullName, birthDate } = await request.json();

  // Giả lập dữ liệu
  const mockData = {
    school_name: 'Đại học Bách Khoa Hà Nội',
    major: 'Công nghệ Thông tin',
    specialization: 'Kỹ thuật Phần mềm',
    diploma_number: '123456',
    registry_number: '7890',
    issue_date: '2023-06-15',
  };

  // Giả lập logic tra cứu
  if (fullName && birthDate) {
    return new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    return new Response(
      JSON.stringify({ message: 'Vui lòng nhập đầy đủ thông tin' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}