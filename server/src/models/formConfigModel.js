const prisma = require('../prisma/client');
// Model xử lý cấu hình biểu mẫu sử dụng Prisma/database

// Hàm lấy cấu hình biểu mẫu từ database bao gồm cả các tùy chọn
async function getFormConfig() {
  try {
    // Lấy cấu hình form cùng với tất cả các dữ liệu liên quan
    const config = await prisma.formConfig.findFirst({
      where: { id: 'default' },
      include: {
        formFields: {
          include: {
            options: true // Bao gồm các tùy chọn của trường
          }
        },
        registrationLimit: {
          include: {
            floorLimits: true
          }
        }
      }
    });
    
    if (!config) {
      return null;
    }
    
    // Chuyển đổi dữ liệu từ database sang định dạng phù hợp với client
    // Tạo đối tượng fields từ formFields
    const fieldsData = {};
    
    // Chuyển đổi formFields thành cấu trúc fields mà client mong đợi
    for (const field of config.formFields) {
      fieldsData[field.fieldName] = {
        label: field.label,
        required: field.required,
        enabled: field.enabled,
        defaultValue: field.defaultValue || '',
        fieldType: field.fieldType || 'text',
        placeholder: field.placeholder || '',
        isCustom: field.isCustom || false
      };
      
      // Thêm thuộc tính allowDateChange và dateFormat cho trường ngày
      if (field.fieldType === 'date') {
        // Nếu allowDateChange là null hoặc undefined, mặc định là true
        fieldsData[field.fieldName].allowDateChange = field.allowDateChange === null || field.allowDateChange === undefined ? true : field.allowDateChange;
        // Thêm định dạng ngày
        fieldsData[field.fieldName].dateFormat = field.dateFormat || 'dd/mm/yyyy';
        console.log(`Trường ${field.fieldName} có allowDateChange = ${fieldsData[field.fieldName].allowDateChange}, dateFormat = ${fieldsData[field.fieldName].dateFormat}`);
      }
      
      // Thêm thuộc tính allowTimeChange và timeFormat cho trường thời gian
      if (field.fieldType === 'time') {
        // Nếu allowTimeChange là null hoặc undefined, mặc định là true
        fieldsData[field.fieldName].allowTimeChange = field.allowTimeChange === null || field.allowTimeChange === undefined ? true : field.allowTimeChange;
        // Thêm định dạng thời gian
        fieldsData[field.fieldName].timeFormat = field.timeFormat || '24h';
        console.log(`Trường ${field.fieldName} có allowTimeChange = ${fieldsData[field.fieldName].allowTimeChange}, timeFormat = ${fieldsData[field.fieldName].timeFormat}`);
      }
      
      // Nếu là trường dropdown tùy chỉnh, lấy các tùy chọn
      if (field.fieldType === 'dropdown' && field.options && field.options.length > 0) {
        fieldsData[field.fieldName].options = field.options.map(option => ({
          value: option.value,
          label: option.label
        }));
      }
    }
    
    // Thêm các tùy chọn từ database vào các trường tương ứng
    if (fieldsData.floor) {
      // Kiểm tra xem config.floorOptions có tồn tại không trước khi gọi map
      fieldsData.floor.options = config.floorOptions && Array.isArray(config.floorOptions) 
        ? config.floorOptions.map(option => option.value) 
        : [];
    }
    
    if (fieldsData.purpose) {
      // Kiểm tra xem config.purposeOptions có tồn tại không trước khi gọi map
      fieldsData.purpose.options = config.purposeOptions && Array.isArray(config.purposeOptions) 
        ? config.purposeOptions.map(option => option.value) 
        : [];
    }
    
    if (fieldsData.contact) {
      // Kiểm tra xem config.contactOptions có tồn tại không trước khi gọi map
      fieldsData.contact.options = config.contactOptions && Array.isArray(config.contactOptions) 
        ? config.contactOptions.map(option => option.value) 
        : [];
    }
    
    if (fieldsData.school) {
      // Kiểm tra xem config.schoolOptions có tồn tại không trước khi gọi map
      fieldsData.school.options = config.schoolOptions && Array.isArray(config.schoolOptions) 
        ? config.schoolOptions.map(option => option.value) 
        : [];
    }
    
    // Tạo đối tượng kết quả với cấu trúc giống như trước đây
    const result = {
      id: config.id,
      title: config.title,
      isFormClosed: config.isFormClosed,
      fields: fieldsData,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      registrationLimit: config.registrationLimit ? {
        enabled: config.registrationLimit.enabled,
        maxRegistrationsPerDay: config.registrationLimit.maxRegistrationsPerDay,
        message: config.registrationLimit.message,
        byFloor: config.registrationLimit.byFloor,
        floorLimits: config.registrationLimit.floorLimits
      } : null
    };
    
    return result;
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình form:', error);
    throw error;
  }
}

// Hàm lưu cấu hình biểu mẫu vào database
async function saveFormConfig(config) {
  try {
    console.log('Nhận dữ liệu cấu hình form:', JSON.stringify(config, null, 2));
    
    // Tách các tùy chọn ra khỏi config
    const { fields, registrationLimit } = config;
    
    if (!fields) {
      throw new Error('Cấu hình form không hợp lệ: thiếu trường fields');
    }
    
    console.log('Trường fields:', JSON.stringify(fields, null, 2));
    
    // Thực hiện transaction để đảm bảo tính toàn vẹn dữ liệu
    console.log('Bắt đầu transaction');
    
    return await prisma.$transaction(async (prisma) => {
      try {
        // 1. Lưu cấu hình chính (không bao gồm fields và registrationLimit)
        console.log('Upsert formConfig với id: default');
        const savedConfig = await prisma.formConfig.upsert({
          where: { id: 'default' },
          update: {
            title: config.title,
            isFormClosed: config.isFormClosed || false,
            updatedAt: new Date()
          },
          create: {
            id: 'default',
            title: config.title,
            isFormClosed: config.isFormClosed || false
          }
        });
        
        console.log('FormConfig đã được lưu:', JSON.stringify(savedConfig, null, 2));
        
        // 2. Xử lý các trường form (formFields)
        // Xóa tất cả các trường cũ
        await prisma.formField.deleteMany({
          where: { formConfigId: 'default' }
        });
        
        // Thêm các trường mới
        for (const fieldName in fields) {
          const fieldData = fields[fieldName];
          
          // Tạo trường mới
          const newField = await prisma.formField.create({
            data: {
              fieldName: fieldName,
              label: fieldData.label || fieldName,
              required: fieldData.required || false,
              enabled: fieldData.enabled !== undefined ? fieldData.enabled : true,
              defaultValue: fieldData.defaultValue || '',
              fieldType: fieldData.fieldType || 'text',
              placeholder: fieldData.placeholder || '',
              isCustom: fieldData.isCustom || false,
              allowDateChange: fieldData.fieldType === 'date' ? (fieldData.allowDateChange !== undefined ? fieldData.allowDateChange : true) : null,
              // Thêm định dạng ngày nếu là trường date
              dateFormat: fieldData.fieldType === 'date' ? (fieldData.dateFormat || 'dd/mm/yyyy') : null,
              
              // Thêm thuộc tính cho trường thời gian
              allowTimeChange: fieldData.fieldType === 'time' ? (fieldData.allowTimeChange === true ? true : false) : null,
              timeFormat: fieldData.fieldType === 'time' ? (fieldData.timeFormat || '24h') : null,
              
              // Log thông tin về định dạng ngày
              ...(fieldData.fieldType === 'date' ? console.log(`Lưu trường ${fieldName} với dateFormat = ${fieldData.dateFormat || 'dd/mm/yyyy'} (giá trị gốc: ${fieldData.dateFormat})`) || {} : {}),
              
              // Log thông tin về trường thời gian
              ...(fieldData.fieldType === 'time' ? console.log(`Lưu trường ${fieldName} với allowTimeChange = ${fieldData.allowTimeChange === true ? true : false}, timeFormat = ${fieldData.timeFormat || '24h'} (giá trị gốc: ${fieldData.allowTimeChange})`) || {} : {}),
              formConfigId: 'default'
            }
          });
          
          // Nếu là trường dropdown và có options, thêm các tùy chọn
          if (fieldData.fieldType === 'dropdown' && Array.isArray(fieldData.options) && fieldData.options.length > 0) {
            for (const option of fieldData.options) {
              await prisma.fieldOption.create({
                data: {
                  value: option.value || option, // Hỗ trợ cả chuỗi và đối tượng
                  label: option.label || option, // Nếu là chuỗi, sử dụng chuỗi làm label
                  formFieldId: newField.id
                }
              });
            }
          }
        }
        
        // Xóa bỏ phần xử lý các tùy chọn (options) không cần thiết
        console.log('Bỏ qua xử lý các options không cần thiết');
        
        // 4. Xử lý giới hạn đăng ký (registrationLimit)
        if (registrationLimit) {
          // Xóa tất cả các giới hạn tầng cũ
          if (registrationLimit.floorLimits) {
            const existingLimit = await prisma.registrationLimit.findFirst({
              where: { formConfigId: 'default' }
            });
            
            if (existingLimit) {
              await prisma.floorLimit.deleteMany({
                where: { registrationLimitId: existingLimit.id }
              });
            }
          }
          
          // Upsert giới hạn đăng ký
          const savedLimit = await prisma.registrationLimit.upsert({
            where: { formConfigId: 'default' },
            update: {
              enabled: registrationLimit.enabled || false,
              maxRegistrationsPerDay: registrationLimit.maxRegistrationsPerDay || 10,
              message: registrationLimit.message || 'Đã đạt giới hạn đăng ký cho ngày hôm nay. Vui lòng thử lại vào ngày mai.',
              byFloor: registrationLimit.byFloor || false,
              updatedAt: new Date()
            },
            create: {
              enabled: registrationLimit.enabled || false,
              maxRegistrationsPerDay: registrationLimit.maxRegistrationsPerDay || 10,
              message: registrationLimit.message || 'Đã đạt giới hạn đăng ký cho ngày hôm nay. Vui lòng thử lại vào ngày mai.',
              byFloor: registrationLimit.byFloor || false,
              formConfigId: 'default'
            }
          });
          
          // Thêm các giới hạn tầng mới
          if (registrationLimit.floorLimits && registrationLimit.byFloor) {
            for (const floorLimit of registrationLimit.floorLimits) {
              await prisma.floorLimit.create({
                data: {
                  floorName: floorLimit.floorName,
                  maxRegistrations: floorLimit.maxRegistrations || 3,
                  enabled: floorLimit.enabled !== undefined ? floorLimit.enabled : true,
                  registrationLimitId: savedLimit.id
                }
              });
            }
          }
        }
        
        // Lấy cấu hình đã lưu để trả về
        const updatedConfig = await getFormConfig();
        return updatedConfig;
      } catch (transactionError) {
        console.error('Lỗi trong transaction:', transactionError);
        throw new Error(`Lỗi trong transaction: ${transactionError.message}`);
      }
    });
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình form:', error);
    throw error;
  }
}

module.exports = {
  getFormConfig,
  saveFormConfig
};
