import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Drawer,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  ActionSnackbar,
  DashboardMain,
  DeleteItemButton,
  PlusIcon,
  XIcon,
  type PlusIconHandle,
  type XIconHandle,
} from '@stackbuild/ui';
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

const minimumCompanyDocumentsSkeletonMs = 350;

const fileSize = (bytes: number) =>
  `${(bytes / 1024 / 1024).toLocaleString('th-TH', { maximumFractionDigits: 1 })} MB`;

export function CompanyDocumentsPage({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = async () => {
    const loadingStartedAt = performance.now();
    setLoading(true);
    try {
      setDocuments(await listCompanyDocuments());
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'ไม่สามารถโหลดเอกสารได้',
      );
    } finally {
      const remainingSkeletonTime = Math.max(
        0,
        minimumCompanyDocumentsSkeletonMs -
          (performance.now() - loadingStartedAt),
      );
      if (remainingSkeletonTime > 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, remainingSkeletonTime);
        });
      }
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
    if (!window.confirm(`ลบ “${document.title}” ใช่หรือไม่`)) return;
    try {
      await deleteCompanyDocument(document.id);
      setDocuments((items) => items.filter((item) => item.id !== document.id));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'ไม่สามารถลบเอกสารได้',
      );
    }
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
        {loading ? (
          <CompanyDocumentsSkeleton />
        ) : documents.length === 0 ? (
          <Alert severity="info">ยังไม่มีเอกสารส่วนกลาง</Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))',
              gap: 2,
            }}
          >
            {documents.map((document) => (
              <Card
                key={document.id}
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 210,
                  borderRadius: '15px',
                  borderColor: '#e8ddd5',
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Chip
                    label={categoryLabel[document.category]}
                    size="small"
                    sx={{ mb: 1.5 }}
                  />
                  <Typography
                    sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.35 }}
                  >
                    {document.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, overflowWrap: 'anywhere' }}
                  >
                    {document.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fileSize(document.sizeBytes)} ·{' '}
                    {new Date(document.createdAt).toLocaleDateString('th-TH')}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void downloadCompanyDocument(document)}
                  >
                    ดาวน์โหลด
                  </Button>
                  {!readOnly && (
                    <DeleteItemButton
                      size="small"
                      onClick={() => void remove(document)}
                      sx={{ flex: 0, minHeight: 36, px: 1.5 }}
                    >
                      ลบ
                    </DeleteItemButton>
                  )}
                </CardActions>
              </Card>
            ))}
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
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 1.25,
                      mt: 1,
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
                  </Box>
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
