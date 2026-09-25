import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Drawer,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  ActionSnackbar,
  DashboardMain,
  DrawerActionBar,
  DeleteItemButton,
  FilterPill,
  PlusIcon,
  SearchField,
  XIcon,
  useMinimumLoading,
  type PlusIconHandle,
  type XIconHandle,
} from '@stackbuild/ui';
import documentExcelIcon from '../assets/document-excel.svg';
import documentPdfIcon from '../assets/document-pdf.svg';
import documentWordIcon from '../assets/document-word.svg';
import {
  createCompanyDocument,
  deleteCompanyDocument,
  downloadCompanyDocument,
  listCompanyDocuments,
  type CompanyDocument,
} from '../api/company-documents';
import { CompanyDocumentsSkeleton } from '../components/skeletons/CompanyDocumentsSkeleton';

const categoryLabel: Record<CompanyDocument['category'], string> = {
  job_application: 'ใบสมัครงาน',
  company_policy: 'กฎและระเบียบบริษัท',
  leave_form: 'เอกสารการลา',
  other: 'เอกสารอื่น ๆ',
};

const fileSize = (bytes: number) =>
  `${(bytes / 1024 / 1024).toLocaleString('th-TH', { maximumFractionDigits: 1 })} MB`;

export function CompanyDocumentsPage({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinimumLoading(loading);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const plusIconRef = useRef<PlusIconHandle>(null);
  const closeIconRef = useRef<XIconHandle>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState<CompanyDocument['category']>('other');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    CompanyDocument['category'] | 'all'
  >('all');
  const [deleteTarget, setDeleteTarget] = useState<CompanyDocument | null>(
    null,
  );

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('th-TH');
    return documents.filter((document) => {
      const matchesCategory =
        categoryFilter === 'all' || document.category === categoryFilter;
      const matchesQuery =
        !normalizedQuery ||
        [document.title, document.fileName, categoryLabel[document.category]]
          .join(' ')
          .toLocaleLowerCase('th-TH')
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, documents, query]);

  const load = async () => {
    setLoading(true);
    try {
      setDocuments(await listCompanyDocuments());
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'ไม่สามารถโหลดเอกสารได้',
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const closeUpload = () => {
    setUploadOpen(false);
    setFile(null);
    setTitle('');
    setCategory('other');
  };
  const submit = async () => {
    if (!file || !title.trim()) {
      setError('กรุณาระบุชื่อเอกสารและเลือกไฟล์');
      return;
    }
    setSaving(true);
    try {
      await createCompanyDocument({ title: title.trim(), category, file });
      closeUpload();
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'ไม่สามารถอัปโหลดเอกสารได้',
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async (document: CompanyDocument) => {
    try {
      await deleteCompanyDocument(document.id);
      setDocuments((items) => items.filter((item) => item.id !== document.id));
      setDeleteTarget(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'ไม่สามารถลบเอกสารได้',
      );
    }
  };
  const documentExtension = (document: CompanyDocument) => {
    const extension = document.fileName.split('.').pop()?.toUpperCase();
    return extension && extension.length <= 5 ? extension : 'FILE';
  };
  const typeColor = (document: CompanyDocument) => {
    const extension = documentExtension(document);
    if (extension === 'PDF') return { bg: '#fff0ef', text: '#ba2d24' };
    if (['XLS', 'XLSX', 'CSV'].includes(extension)) {
      return { bg: '#edf8f0', text: '#287748' };
    }
    if (['DOC', 'DOCX'].includes(extension)) {
      return { bg: '#eef4ff', text: '#3266ae' };
    }
    return { bg: '#f7eee8', text: '#805637' };
  };
  const documentIcon = (document: CompanyDocument) => {
    const extension = documentExtension(document);
    if (extension === 'PDF') return documentPdfIcon;
    if (['XLS', 'XLSX', 'CSV'].includes(extension)) return documentExcelIcon;
    if (['DOC', 'DOCX'].includes(extension)) return documentWordIcon;
    return null;
  };
  return (
    <DashboardMain>
      <Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                color: '#3c2d24',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              เอกสารส่วนกลาง
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
                fontSize: 13,
              }}
            >
              เอกสารสำหรับการทำงานและแฟรนไชส์
            </Typography>
          </Box>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<PlusIcon ref={plusIconRef} size={16} />}
              onClick={() => setUploadOpen(true)}
              onMouseEnter={() => plusIconRef.current?.startAnimation()}
              onMouseLeave={() => plusIconRef.current?.stopAnimation()}
              sx={{
                minHeight: 40,
                borderRadius: '12px',
                bgcolor: '#201914',
                fontFamily: 'Kanit, sans-serif',
                fontWeight: 500,
                boxShadow: 'none',
                '& .MuiButton-startIcon': { ml: 0.5, mr: 0.75 },
                '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
              }}
            >
              เพิ่มเอกสาร
            </Button>
          )}
        </Box>
        {showSkeleton ? (
          <CompanyDocumentsSkeleton />
        ) : documents.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: '14px' }}>
            ยังไม่มีเอกสารส่วนกลาง
          </Alert>
        ) : (
          <Box>
            <Box
              sx={{
                alignItems: { xs: 'stretch', md: 'center' },
                bgcolor: '#fbf8f5',
                border: '1px solid #eee5df',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                justifyContent: 'space-between',
                mb: 2,
                px: { xs: 2, sm: 2.5 },
                py: 2,
              }}
            >
              <Box sx={{ alignItems: 'center', display: 'flex', gap: 1.5 }}>
                <Box
                  sx={{
                    alignItems: 'center',
                    bgcolor: '#f1e6dd',
                    borderRadius: '12px',
                    color: '#805637',
                    display: 'flex',
                    fontFamily: 'Kanit, sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                    height: 44,
                    justifyContent: 'center',
                    width: 44,
                  }}
                >
                  DOC
                </Box>
                <Box>
                  <Typography
                    sx={{ fontFamily: 'Kanit, sans-serif', fontSize: 13 }}
                  >
                    เอกสารทั้งหมด
                  </Typography>
                  <Typography
                    sx={{
                      color: '#3c2d24',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 24,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {documents.length} ไฟล์
                  </Typography>
                </Box>
              </Box>
              <Typography
                sx={{
                  alignSelf: { xs: 'auto', md: 'center' },
                  color: 'text.secondary',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 13,
                }}
              >
                {readOnly
                  ? 'เลือกเอกสารที่ต้องการ แล้วดาวน์โหลดไปใช้งาน'
                  : 'จัดการเอกสารที่ทีมงานและแฟรนไชส์ใช้ร่วมกัน'}
              </Typography>
            </Box>
            <Box
              sx={{
                alignItems: { xs: 'stretch', lg: 'center' },
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 1.25,
                mb: 2,
              }}
            >
              <SearchField
                placeholder="ค้นหาชื่อเอกสาร ชื่อไฟล์ หรือประเภทเอกสาร"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                size="small"
                sx={{
                  maxWidth: { lg: 390 },
                  minWidth: 0,
                  width: '100%',
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                }}
              >
                {(
                  [
                    ['all', 'ทั้งหมด'],
                    ...Object.entries(categoryLabel),
                  ] as Array<[CompanyDocument['category'] | 'all', string]>
                ).map(([value, label]) => (
                  <FilterPill
                    key={value}
                    selected={categoryFilter === value}
                    onClick={() => setCategoryFilter(value)}
                  >
                    {label}
                  </FilterPill>
                ))}
              </Box>
            </Box>
            {visibleDocuments.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '14px' }}>
                ไม่พบเอกสารที่ตรงกับการค้นหา
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                }}
              >
                {visibleDocuments.map((document) => {
                  const color = typeColor(document);
                  const icon = documentIcon(document);
                  return (
                    <Card
                      key={document.id}
                      variant="outlined"
                      sx={{
                        borderColor: '#e8ddd5',
                        borderRadius: '15px',
                        position: 'relative',
                        boxShadow: 'none',
                      }}
                    >
                      <CardContent
                        sx={{
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          display: 'flex',
                          gap: { xs: 1.25, sm: 1.75 },
                          p: { xs: 1.5, sm: 2 },
                          '&:last-child': { pb: { xs: 1.5, sm: 2 } },
                        }}
                      >
                        <Box
                          sx={{
                            alignItems: 'center',
                            bgcolor: icon ? 'transparent' : color.bg,
                            borderRadius: '12px',
                            color: color.text,
                            display: 'flex',
                            flex: '0 0 auto',
                            fontFamily: 'Kanit, sans-serif',
                            fontSize: 12,
                            fontWeight: 700,
                            height: { xs: 48, sm: 56 },
                            justifyContent: 'center',
                            width: { xs: 48, sm: 56 },
                          }}
                        >
                          {icon ? (
                            <Box
                              component="img"
                              src={icon}
                              alt={`${documentExtension(document)} file`}
                              sx={{
                                display: 'block',
                                height: { xs: 40, sm: 48 },
                                objectFit: 'contain',
                                width: { xs: 40, sm: 48 },
                              }}
                            />
                          ) : (
                            documentExtension(document)
                          )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              color: '#3c2d24',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: { xs: 16, sm: 17 },
                              fontWeight: 600,
                              lineHeight: 1.35,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {document.title}
                          </Typography>
                          <Box
                            sx={{
                              color: 'text.secondary',
                              display: 'grid',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 12,
                              gap: 0.25,
                              gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'minmax(0, 1fr) auto auto',
                              },
                              mt: 0.75,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{ overflowWrap: 'anywhere', minWidth: 0 }}
                            >
                              ไฟล์: {document.fileName}
                            </Box>
                            <Box component="span">
                              ขนาด: {fileSize(document.sizeBytes)}
                            </Box>
                            <Box component="span">
                              อัปโหลด:{' '}
                              {new Date(document.createdAt).toLocaleDateString(
                                'th-TH',
                              )}
                            </Box>
                          </Box>
                        </Box>
                        <CardActions
                          sx={{
                            alignItems: 'center',
                            flex: '0 0 auto',
                            gap: 0.75,
                            p: 0,
                            pt: { xs: 0.25, sm: 0 },
                          }}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              void downloadCompanyDocument(document)
                            }
                            sx={{
                              borderColor: '#bfa99a',
                              borderRadius: '10px',
                              color: '#5f4b3d',
                              fontFamily: 'Kanit, sans-serif',
                              minHeight: 36,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ดาวน์โหลด
                          </Button>
                          {!readOnly && (
                            <DeleteItemButton
                              aria-label={`ลบ ${document.title}`}
                              size="small"
                              onClick={() => setDeleteTarget(document)}
                              sx={{
                                flex: 0,
                                flexShrink: 0,
                                minHeight: 36,
                                minWidth: { xs: 88, sm: 96 },
                                px: 1.25,
                                width: { xs: 88, sm: 96 },
                              }}
                            >
                              ลบเอกสาร
                            </DeleteItemButton>
                          )}
                        </CardActions>
                      </CardContent>
                      {!readOnly && deleteTarget?.id === document.id && (
                        <Box
                          sx={{
                            alignItems: 'center',
                            bgcolor: 'rgba(32, 25, 20, .94)',
                            color: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                            inset: 0,
                            justifyContent: 'center',
                            p: 2.5,
                            position: 'absolute',
                            textAlign: 'center',
                            zIndex: 2,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 18,
                              fontWeight: 600,
                            }}
                          >
                            ยืนยันการลบเอกสาร?
                          </Typography>
                          <Typography
                            sx={{
                              color: 'rgba(255,255,255,.75)',
                              fontFamily: 'Kanit, sans-serif',
                              fontSize: 13,
                              textAlign: 'center',
                            }}
                          >
                            “{document.title}” จะถูกลบออกจากเอกสารส่วนกลาง
                          </Typography>
                          <Box
                            sx={{
                              alignItems: 'center',
                              display: 'flex',
                              gap: 1,
                              position: 'absolute',
                              right: 16,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: { xs: 'calc(100% - 32px)', sm: 'auto' },
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setDeleteTarget(null)}
                              sx={{
                                borderColor: 'rgba(255,255,255,.45)',
                                borderRadius: '10px',
                                color: '#fff',
                                fontFamily: 'Kanit, sans-serif',
                                height: 36,
                                minWidth: { xs: 0, sm: 112 },
                                px: 2,
                                width: { xs: '50%', sm: 112 },
                              }}
                            >
                              ยกเลิก
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => void remove(document)}
                              sx={{
                                bgcolor: '#df2c31',
                                borderRadius: '12px',
                                boxShadow: 'none',
                                fontFamily: 'Kanit, sans-serif',
                                fontSize: 13,
                                fontWeight: 700,
                                height: 36,
                                minWidth: { xs: 0, sm: 96 },
                                px: 1.25,
                                width: { xs: '50%', sm: 96 },
                                '&:hover': {
                                  bgcolor: '#bd2026',
                                  boxShadow: 'none',
                                },
                              }}
                            >
                              ยืนยันลบ
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
        <Drawer
          anchor="bottom"
          open={uploadOpen}
          onClose={closeUpload}
          transitionDuration={{ enter: 360, exit: 280 }}
          sx={{ zIndex: 1300 }}
          slotProps={{
            paper: {
              sx: {
                left: { md: '280px' },
                width: { md: 'calc(100% - 304px)' },
                height: { xs: '88dvh', sm: 'calc(100dvh - 72px)' },
                overflow: 'hidden',
                borderRadius: '16px 16px 0 0',
                bgcolor: '#fffaf7',
              },
            },
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              px: { xs: 2.5, sm: 4 },
              pt: 1.5,
              pb: 3.5,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 5,
                mx: 'auto',
                mb: 2.5,
                borderRadius: 99,
                bgcolor: '#d8c8bd',
              }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  color: '#201914',
                  fontFamily: 'Kanit, sans-serif',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                เพิ่มเอกสารส่วนกลาง
              </Typography>
              <Button
                aria-label="ปิด"
                onClick={closeUpload}
                onMouseEnter={() => closeIconRef.current?.startAnimation()}
                onMouseLeave={() => closeIconRef.current?.stopAnimation()}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 40,
                  width: 40,
                  height: 40,
                  p: 0,
                  borderRadius: '12px',
                  bgcolor: '#f7eee8',
                  color: '#5f4b3d',
                  '&:hover': { bgcolor: '#f1e4da' },
                }}
              >
                <XIcon ref={closeIconRef} size={20} />
              </Button>
            </Box>
            <Typography
              sx={{
                mt: 0.5,
                color: 'text.secondary',
                fontFamily: 'Kanit, sans-serif',
              }}
            >
              อัปโหลดเอกสารเพื่อให้ทีมงานและแฟรนไชส์ดาวน์โหลดได้
            </Typography>
            <Divider
              sx={{
                mt: 2.25,
                mx: { xs: -2.5, sm: -4 },
                borderColor: '#e8ddd5',
              }}
            />
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                pt: 2.25,
                pr: 0.5,
              }}
            >
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0, 1fr) minmax(0, 2fr)',
                  },
                  gap: 2.5,
                  '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                }}
              >
                <Box
                  component="label"
                  sx={{
                    alignItems: 'center',
                    alignSelf: 'start',
                    aspectRatio: '1 / 1',
                    bgcolor: '#f7eee8',
                    border: '1.5px dashed #c9b6a9',
                    borderRadius: '16px',
                    color: '#5f4b3d',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    px: 2,
                    textAlign: 'center',
                    '&:hover': { bgcolor: '#f1e4da', borderColor: '#805637' },
                  }}
                >
                  <Typography
                    sx={{ fontFamily: 'Kanit, sans-serif', fontWeight: 500 }}
                  >
                    {file ? file.name : 'เลือกไฟล์เอกสาร'}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontFamily: 'Kanit, sans-serif',
                      fontSize: 12,
                      mt: 0.25,
                    }}
                  >
                    PDF, Word หรือ Excel ขนาดไม่เกิน 10 MB
                  </Typography>
                  <input
                    ref={inputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                  />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                    },
                    alignContent: 'start',
                    gap: 2,
                  }}
                >
                  <TextField
                    label="ชื่อเอกสาร"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    fullWidth
                    sx={{ gridColumn: { sm: '1 / -1' } }}
                  />
                  <TextField
                    select
                    label="ประเภทเอกสาร"
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value as CompanyDocument['category'],
                      )
                    }
                    fullWidth
                    sx={{ gridColumn: { sm: '1 / -1' } }}
                  >
                    {Object.entries(categoryLabel).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <DrawerActionBar
                    sx={{
                      alignSelf: 'start',
                      gridColumn: { sm: '1 / -1' },
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={closeUpload}
                      sx={{
                        minHeight: 40,
                        borderRadius: '12px',
                        color: '#5f4b3d',
                        fontFamily: 'Kanit, sans-serif',
                      }}
                    >
                      ยกเลิกเพิ่ม
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={saving}
                      sx={{
                        minHeight: 40,
                        borderRadius: '12px',
                        bgcolor: '#201914',
                        fontFamily: 'Kanit, sans-serif',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#3c2d24', boxShadow: 'none' },
                      }}
                    >
                      {saving ? 'กำลังอัปโหลด…' : 'บันทึกเอกสาร'}
                    </Button>
                  </DrawerActionBar>
                </Box>
              </Box>
            </Box>
          </Box>
        </Drawer>
      </Box>
      <ActionSnackbar
        notice={error ? { message: error, severity: 'error' } : null}
        onClose={() => setError('')}
      />
    </DashboardMain>
  );
}
